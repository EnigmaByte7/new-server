import type { RedisClient } from "../../config/redis.ts";
import { MatchService } from "../../domain/matches/match.service.ts";
import { ProblemService } from "../../domain/problem/problem.service.ts";
import { EventBus } from '../../shared/eventbus.ts';

export class MatchmakerService {
  private running = false;

  constructor(
    private redis: RedisClient,
    private matchService: MatchService,
    private problemService: ProblemService,
    private eventBus: EventBus
  ) {}

  async start() {
    this.running = true;
    console.log("Matchmaker started...");
    const redisDuplicate = this.redis.duplicate()
    await redisDuplicate.connect()


    while (this.running) {
      try {
        const p1 = await this.redis.blPop("queue:ranked", 0);
        if (!p1) continue;

        const p2 = await this.redis.blPop("queue:ranked", 0);
        if (!p2) {
          await this.redis.rPush("queue:ranked", p1.element);
          continue;
        }

        const player1 = p1.element;
        const player2 = p2.element;

        await this.redis.sRem("queue:ranked:members", [player1, player2]);

        const problems = this.problemService.getProblemSet();
        const match = await this.matchService.createMatch([player1, player2], problems);

        const [meta1, meta2] = await Promise.all([
          this.redis.hGetAll(`user_meta:${player1}`),
          this.redis.hGetAll(`user_meta:${player2}`)
        ]);
        const matchId = match._id.toString(); 
        await this.redis.set(`match_timeout:${matchId}`, "active", { EX: 600 });

        const streamData = {
              matchId: matchId,
              p1_id: player1,
              p1_name: meta1.name || "Anonymous",
              p1_image: meta1.image || "",
              p2_id: player2,
              p2_name: meta2.name || "Anonymous",
              p2_image: meta2.image || "",
              endTime: (Date.now() + 600000).toString(),
              problems: JSON.stringify(problems)
            };

        console.log('match data being streamed ', streamData );
        

        await this.redis.xAdd("stream:matches", "*", streamData);

        console.log(`Match created and streamed: ${matchId}`);
        console.log(`Match created: ${match.id}`);
      } catch (err) {
        console.error("Matchmaker error:", err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  stop() {
    this.running = false;
  }
}