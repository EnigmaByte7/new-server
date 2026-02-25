import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
  userId: string;
  matchId: string;
  problemId: string;
  code: string;
  languageId: number;

  judgeToken: string;
  status: 'pending' | 'accepted' | 'wrong' | 'error';
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  userId: { type: String, required: true },
  matchId: { type: String, required: true },
  problemId: { type: String, required: true },
  code: { type: String, required: true },
  languageId: { type: Number, required: true },

  judgeToken: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'wrong', 'error'],
    default: 'pending'
  }
}, { timestamps: true });

export const SubmissionModel = mongoose.model<ISubmission>(
  'Submission',
  SubmissionSchema
);
