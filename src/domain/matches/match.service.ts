import { Model } from "mongoose";
import { type MatchDocument } from "./models/matches.model.ts";

export class MatchService {
  constructor(private matchModel: Model<MatchDocument>) {}

  async createMatch(
    players: [string, string],
    problems: any[]
  ) {
    const res = await this.matchModel.create({
      players,
      problems,
      status: "WAITING",
    }); 
    console.log('match created', res);
    
    return res
  }

  async startMatch(matchId: string) {
    return this.matchModel.findByIdAndUpdate(
      matchId,
      {
        status: "RUNNING",
        startedAt: new Date(),
      },
      { new: true }
    );
  }

  async finishMatch(
    matchId: string,
    winner: string
  ) {
    return this.matchModel.findByIdAndUpdate(
      matchId,
      {
        status: "FINISHED",
        winner,
        finishedAt: new Date(),
      },
      { new: true }
    );
  }
}
