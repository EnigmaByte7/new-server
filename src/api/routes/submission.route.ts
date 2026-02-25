import express from "express";
import { SubmissionModel } from "../../models/submission.schema.ts";
import axios from "axios";

const router = express.Router();

router.post('/', async (req, res) => {
    const JUDGE0_URL = 'http://localhost:2358/submissions' 
    const BASE_URL = 'http://localhost:3000'
    const { userId, matchId, problemId, code, languageId,expOutput , stdin} = req.body;

    const submission = await SubmissionModel.create({
        userId,
        matchId,
        problemId,
        code,
        languageId,
        status: 'pending'
    });

    const response = await axios.post(JUDGE0_URL, {
        source_code: code,
        language_id: languageId,
        callback_url: `http://host.docker.internal:4000/callback`,
        stdin: stdin || '',
        expected_output: expOutput || '',
    });

    submission.judgeToken = response.data.token;
    await submission.save();

    res.json({ submissionId: submission._id });
});


export const submissionRouter = router;
