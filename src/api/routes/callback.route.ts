import express from "express";
import { SubmissionModel } from "../../models/submission.schema.ts";
import {redis} from '../../config/redis.ts'

const router = express.Router();

router.put('/', async (req, res) => {
  console.log('here in callback.....');
  
  const { token, status, stdout, stderr, compile_output, message } = req.body;
  console.log(token, status, stdout, stderr, compile_output, message);
  

  const submission = await SubmissionModel.findOne({
    judgeToken: token
  });
  console.log('submission : ', submission);

  if (!submission) return res.sendStatus(404);

  
  const mappedStatus =
    status.description === 'Accepted'
      ? 'accepted'
      : status.description === 'Wrong Answer'
      ? 'wrong'
      : 'error';

  submission.status = mappedStatus;
  await submission.save();

  await redis.xAdd(
    'submission.judged',
    '*',
    {
      'submissionId': submission._id.toString(),
      'matchId': submission.matchId,
      'userId': submission.userId,
      'status': mappedStatus,
      'problemId': submission.problemId,
      'stdout': stdout || "",
      'stderr': stderr || "",
      'compile_output': compile_output || "",
      'message': message || status.description
    }
  );

  res.sendStatus(200);
})

export const callbackRouter = router;