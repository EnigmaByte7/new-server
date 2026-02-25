import { redis } from '../config/redis.ts'
import { MatchModel } from "../domain/matches/models/matches.model.ts";
import { MatchService } from "../domain/matches/match.service.ts";
import { ProblemService } from "../domain/problem/problem.service.ts";
import { EventBus } from "../shared/eventbus.ts";
import { initRedis } from '../config/redis.ts';
import { initMongo } from '../config/mongo.ts';
import { MatchmakerService } from "../application/matchmaker/matchmaker.service.ts";

async function bootstrap() {
  await initMongo()
  await initRedis()
  const matchService = new MatchService(MatchModel);
  const problemService = new ProblemService();
  const eventBus = new EventBus();

  const matchmaker = new MatchmakerService(
    redis,
    matchService,
    problemService,
    eventBus
  );

  matchmaker.start();

  process.on("SIGINT", async () => {
    console.log("Shutting down...");
    matchmaker.stop();
    await redis.quit();
    process.exit(0);
  });
}

bootstrap();
