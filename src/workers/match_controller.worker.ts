import { redis } from '../config/redis.ts';
import { MatchModel, MatchStates } from "../domain/matches/models/matches.model.ts";
import { initRedis } from '../config/redis.ts';
import { initMongo } from '../config/mongo.ts';

async function startMatchController() {
    await initMongo();
    const MAX_SCORE = 2;
    await initRedis();
    const group = 'match-controller-group';
    const consumer = 'match-controller-1';
    const listener = redis.duplicate();
    await listener.connect();

    await listener.xGroupCreate('submission.judged', group, '$', { MKSTREAM: true }).catch(() => {});

    while (true) {
        try {
            const data = await listener.xReadGroup(
                group,
                consumer,
                [{ key: 'submission.judged', id: '>' }],
                { BLOCK: 0, COUNT: 1 }
            );

            if (!data) continue;

            for (const stream of data) {
                for (const message of stream.messages) {
                    const { matchId, userId, status, problemId, stdout, stderr, compile_output } = message.message;
                    
                    const match = await MatchModel.findById(matchId);
                    const socketId = await redis.get(`user_socket:${userId}`);
                    console.log('outoud .....');
                    
                    if (socketId) {
                        await redis.xAdd('stream:outbound' , '*', {
                            target: userId,
                            matchId,
                            problemId,
                            status,
                            stdout,
                            stderr,
                            compile_output 
                        })
                        await redis.xAck('submission.judged', group, message.id);   
                    }           

                    if (status === "accepted" && match && (match.status === MatchStates.ACTIVE || match.status === "WAITING")) {
                        const updateResult = await MatchModel.updateOne(
                            {
                                _id: matchId,
                                [`solved.${userId}`]: { $ne: problemId }
                            },
                            {
                                $push: { [`solved.${userId}`]: problemId },
                                $inc: { [`scores.${userId}`]: 1 }
                            }
                        );

                        if (updateResult.modifiedCount > 0) {
                            const updatedMatch = await MatchModel.findById(matchId);
                            if (!updatedMatch) continue;

                            const scoresObj = updatedMatch.scores instanceof Map ? Object.fromEntries(updatedMatch.scores) : updatedMatch.scores;
                            const userScore = scoresObj[userId] || 0;

                            let eventData: any = {
                                matchId: matchId.toString(),
                                status: updatedMatch.status,
                                winner: '',
                                scores: JSON.stringify(scoresObj),
                                solved: JSON.stringify(updatedMatch.solved)
                            };

                            if (userScore >= MAX_SCORE) {
                                await MatchModel.updateOne(
                                    { _id: matchId },
                                    { status: MatchStates.FINISHED, winner: userId, finishedAt: new Date() }
                                );
                                eventData.status = MatchStates.FINISHED;
                                eventData.winner = userId;

                                await redis.del(`match_timeout:${matchId}`);
                                
                                for (const player of updatedMatch.players) {
                                    await redis.del(`user_active_match:${player}`);
                                }
                            }

                            await redis.xAdd('match.updated', '*', eventData);
                        }
                    }
                    await listener.xAck('submission.judged', group, message.id);
                }
            }
        } catch (err) {
            console.error("Match Controller Error:", err);
            await new Promise(res => setTimeout(res, 1000));
        }
    }
}

startMatchController();