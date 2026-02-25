import { Server } from "socket.io";
import { redis } from "../config/redis.ts";
import { LobbyService } from "../services/lobby.service.ts";
import { MatchModel } from "../domain/matches/models/matches.model.ts";
import { VALID_CODES } from "../types/emoji.ts";

let io: Server;

export async function initSocket(server: any, services: {
  lobbyService: LobbyService
}) {
  console.log('inside init socket....');
  
  io = new Server(server, {
    cors: { origin: "*" },
    methods: ["GET", "POST"]
  });

  io.use((socket, next) => {
    const userId = socket.handshake.auth.token; 
    const name = socket.handshake.auth.name;
    const image = socket.handshake.auth.image;

    //console.log('from socket middleware : ', userId, image, name);
    
    if (!userId) return next(new Error("Unauthorized"));
    
    socket.data.name= name;
    socket.data.image= image;
    socket.data.uid = userId; 

    next();
});

  io.on("connection", async (socket) => {
    console.log("Connected:", socket.id);

    const userId = socket.data.uid;
    if (!userId) return socket.disconnect();

    await redis.set(`user_socket:${userId}`, socket.id);

    const activeMatchId = await redis.get(`user_active_match:${userId}`);
    console.log(socket?.data.uid, activeMatchId);
    

    if (activeMatchId) {
        const match = await MatchModel.findById(activeMatchId);
        if (match && match.status !== "FINISHED") {
            await socket.join(`match:${activeMatchId}`);
            const endTime = new Date(match.startedAt!).getTime() + (10 * 60 * 1000);

            socket.emit("match:sync", {
                matchId: activeMatchId,
                status: match.status,
                scores: match.scores instanceof Map ? Object.fromEntries(match.scores) : match.scores,
                solved: match.solved,
                problems: match.problems,
                startTime: match.startedAt,
                endTime: endTime
            });
        }
    }

    socket.on("reaction",async (data) => {   
      const {matchId: mid, reaction, userId} = data
      console.log(mid, reaction, userId);
      
      const activeMatchId = await redis.get(`user_active_match:${userId}`);
      // if(!activeMatchId) return;
      // if(mid !== activeMatchId) return
      // if(!VALID_CODES.includes(reaction)) return;

      console.log(activeMatchId);
      
      socket.to(`match:${activeMatchId}`).emit("reaction", {
          reaction, 
          userId   
      });
    })

    socket.on("register", async (uid: string) => {
      const res = await redis.set(`user_socket:${uid}`, socket.id);
      
      socket.data.uid = uid;
      console.log("User registered:", uid);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });

    socket.on("join_queue", async () => {
      console.log('here in join queue');
      
      const uid = socket.data.uid;
      const user = { 
        uid: socket.data.uid,
        name: socket.data.name,
        image: socket.data.image
      }
      console.log('uid ', uid);
      
      if (!uid) return;

      await services.lobbyService.enqueue(user);

      socket.emit("queue_joined");
      console.log("User joined queue:", uid);
    });

    socket.on("leave_queue", async () => {
      const uid = socket.data.uid;
      if (!uid) return;

      await services.lobbyService.dequeue(uid);

      socket.emit("queue_left");
      console.log("User left queue:", uid);
    });

    });
}

export function getIO() {
  return io;
}
