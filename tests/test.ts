import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'http://localhost:4000';
const API_URL = 'http://localhost:4000/submission'; 

function createPlayer(uid : string) {
  const socket = io(SOCKET_URL, { transports: ["websocket"] , auth: { token: uid, name: 'alice', image: 'https://images.unsplash.com/photo-1761959939997-bde7210e7b1f?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} });

  socket.on('connect', () => {
    console.log(`[${uid}] Connected.`);
    socket.emit('register', uid);
    setTimeout(() => {
      socket.emit('join_queue');
    }, 2000)
  });

  socket.on('queue_joined', () => {
    console.log(`[${uid}] Joined queue.`);
  });

  socket.on('reaction', (data) => 
    console.log(data)
  )
  
  socket.on('match_found', async (data) => {
    const { matchId } = data;
    console.log(`[${uid}] Match found! ID: ${data}`);

    if (uid === 'alice') {
      // setTimeout(async () => {
      //   try {
      //     console.log(`[${uid}] Submitting C++ solution...`);
          
      //     const response = await axios.post(API_URL, {
      //       userId: uid,
      //       matchId: matchId,
      //       problemId: "prob_1",
      //       languageId: 54,    
      //       code: `#include <iostream>\nint main() { std::cout << "hello world"; return 0; }`
      //     });

      //     console.log(`[${uid}] Submitted! SubmissionID: ${response.data.submissionId}`);
      //   } catch (err) {
      //     console.error(err);
      //   }
      // }, 9000);
    }
  });

  socket.on('match:update', (update) => {
    console.log(`[${uid}] MATCH UPDATE RECEIVED:`, update);
  });

  return socket;
}

const player1 = createPlayer("alice");
//setTimeout(() => createPlayer("bob"), 1000);