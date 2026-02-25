import { redis } from '../config/redis.ts';
import { MatchModel } from '../domain/matches/models/matches.model.ts';
import { Server } from 'socket.io';

export async function startKeyspaceListener(io: Server) {
    const sub = redis.duplicate();
    await sub.connect();

    await redis.configSet('notify-keyspace-events', 'Ex');

    await sub.subscribe("__keyevent@0__:expired", async (key) => {
        if (key.startsWith("lobby_timeout:")) {
            const userId = key.split(":")[1]
            console.log('lobby timeout..', userId);
            await redis.sRem("queue:ranked:members", userId!);
            const socketId = await redis.get(`user_socket:${userId}`);
            if (socketId) io.to(socketId).emit("queue:timeout");
        }

        if (key.startsWith("match_timeout:")) {
            const matchId = key.split(":")[1];
            const match = await MatchModel.findById(matchId);
            
            if (match) {
                const scoresObj = match.scores instanceof Map  ? Object.fromEntries(match.scores) : match.scores;
                
                const playerIds = Object.keys(scoresObj);
                console.log('here in listenere... ', scoresObj, playerIds);
                
                let winnerId: string = "DRAW"; 

                if (playerIds.length === 2) {
                    const s1 = scoresObj[playerIds[0]] || 0;
                    const s2 = scoresObj[playerIds[1]] || 0;
                    if (s1 > s2) winnerId = playerIds[0];
                    else if (s2 > s1) winnerId = playerIds[1];
                } else if (playerIds.length === 1) {
                    winnerId = playerIds[0];
                } else if (match.players.length > 0 && playerIds.length === 0) {
                    winnerId = "DRAW";
                }

                console.log('winnre :', winnerId);
                
                await MatchModel.updateOne(
                    { _id: matchId },
                    { status: "FINISHED", winner: winnerId, finishedAt: new Date() }
                );

                for (const pid of match.players) {
                    await redis.del(`user_active_match:${pid}`);
                }

                await redis.xAdd('match.updated', '*', {
                    matchId,
                    status: "FINISHED",
                    winner: winnerId,
                    scores: JSON.stringify(scoresObj),
                    solved: JSON.stringify(match.solved)
                });
            }
        }
    });
}