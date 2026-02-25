import http from "http";
import dotenv from "dotenv";
import { app } from "./app.ts";
import { initSocket } from "./socket/index.ts";
import { initRedis } from "./config/redis.ts";
import { LobbyService } from "./services/lobby.service.ts";
import {redis} from "./config/redis.ts";
import { initMongo } from "./config/mongo.ts";
import { getIO } from "./socket/index.ts";
import { startNotificationService } from "./services/notification.service.ts";
import { startKeyspaceListener } from "./services/expiry.service.ts";

dotenv.config();

async function bootstrap() {
  await initRedis();
  await initMongo();

  const server = http.createServer(app);
  const lobbyService = new LobbyService(redis);
  initSocket(server, { lobbyService});
  startNotificationService(getIO())
  startKeyspaceListener(getIO())

  const PORT = process.env.PORT || 4000;

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

bootstrap();
