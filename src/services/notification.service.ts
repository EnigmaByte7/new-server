import { redis } from '../config/redis.ts';
import { Server } from 'socket.io';
import { MatchModel } from '../domain/matches/models/matches.model.ts';

export async function startNotificationService(io: Server) {
  const group = 'notification-group';
  const consumer = `notification-${process.pid}`;
  const listener = redis.duplicate();
  await listener.connect();
  
  await Promise.all([
    redis.xGroupCreate('match.updated', group, '$', { MKSTREAM: true }).catch(() => {}),
    redis.xGroupCreate('stream:matches', group, '$', { MKSTREAM: true }).catch(() => {}),
    redis.xGroupCreate('stream:outbound', group, '$', { MKSTREAM: true }).catch(() => {}),
  ]);

  while (true) {
    try {
      const data = await listener.xReadGroup(
        group,
        consumer,
        [
          { key: 'match.updated', id: '>' },
          { key: 'stream:matches', id: '>' },
          { key: 'stream:outbound', id: '>' }
        ],
        { BLOCK: 0, COUNT: 1 }
      );

      if (!data) continue;

      for (const stream of data) {
        for (const message of stream.messages) {
          const msg = message.message;

          if (stream.name === 'stream:outbound') {
            const { target, matchId, problemId, status, stdout, stderr, compile_output } = msg;
            const socketId = await redis.get(`user_socket:${target}`);
            console.log('about to publish...', socketId);
            
            io.to(socketId!).emit('submission:update', {
              matchId,
              problemId,
              status,
              stdout,
              stderr,
              compile_output
            });
            await listener.xAck('stream:outbound', group, message.id);
          }

          if (stream.name === 'match.updated') {
            const { matchId, winner, status, scores, solved } = msg;
            io.to(`match:${matchId}`).emit('match:update', { 
              matchId, 
              winner, 
              status,
              scores: JSON.parse(scores),
              solved: JSON.parse(solved)
            });
            await listener.xAck('match.updated', group, message.id);
          }

          if (stream.name === 'stream:matches') {
            const { matchId, p1_id, p1_name, p1_image, p2_id, p2_name, p2_image, endTime, problems } = msg;
            await redis.set(`user_active_match:${p1_id}`, matchId);
            await redis.set(`user_active_match:${p2_id}`, matchId);
            
            await MatchModel.updateOne({ _id: matchId }, { status: "ACTIVE" });

            const players = [
              { id: p1_id, name: p1_name, image: p1_image },
              { id: p2_id, name: p2_name, image: p2_image }
            ];

            for (let i = 0; i < players.length; i++) {
              const currentPlayer = players[i];
              const opponent = players[i === 0 ? 1 : 0];

              const socketId = await redis.get(`user_socket:${currentPlayer!.id}`);
              if (socketId) {
                const sockets = await io.in(socketId).fetchSockets();
                
                if (sockets.length > 0) {
                  sockets[0].join(`match:${matchId}`);

                  io.to(socketId).emit("match_found", { 
                    matchId,
                    opponent: {
                      id: opponent.id,
                      name: opponent.name,
                      image: opponent.image
                    },
                    questions: JSON.parse(problems),
                    endTime: Number(endTime)
                  });
                }
              }
            }
            await listener.xAck('stream:matches', group, message.id);
          }
        }
      }
    } catch (err) {
      console.error("Notification Service Error:", err);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}