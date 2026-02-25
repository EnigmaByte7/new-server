import { Schema, model, Document } from "mongoose";

export type MatchStatus =
  | "WAITING"
  | "RUNNING"
  | "FINISHED"
  | "CANCELLED"
  | "ACTIVE";

export enum MatchStates {
  WAITING = "WAITING",
  RUNNING = "RUNNING",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED",
  ACTIVE = "ACTIVE",
}

interface ProblemSnapshot {
  id: string;
  title: string;
  description: string;
  driverCode: string;
  constraints: string;
  testCases: {
    input: string;
    output: string;
  }[];
}

export interface MatchDocument extends Document {
  players: [string, string];
  problems: ProblemSnapshot[];
  status: MatchStatus;
  winner?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  scores: Record<string, number>;
  solved: Record<string, string[]>;
  winScore: number;
}

const ProblemSchema = new Schema<ProblemSnapshot>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    driverCode: { type: String, required: true },
    constraints: { type: String, required: true },
    testCases: [
      {
        input: { type: String, required: true },
        output: { type: String, required: true },
      },
    ],
  },
  { _id: false }
);

const MatchSchema = new Schema<MatchDocument>(
  {
    players: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => arr.length === 2,
        message: "Match must have exactly 2 players",
      },
    },
    problems: {
      type: [ProblemSchema],
      required: true,
    },
    status: {
      type: String,
      enum: ["WAITING", "RUNNING", "FINISHED", "CANCELLED", "ACTIVE"],
      required: true,
    },
    winner: { type: String },
      scores: {
      type: Object,
      default: {}
    },
    solved: {
      type: Object,
      default: {}
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    winScore: { type: Number, default: 3 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const MatchModel = model<MatchDocument>(
  "Match",
  MatchSchema
);
