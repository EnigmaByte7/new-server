import express from "express";
import { callbackRouter } from "./api/routes/callback.route.ts";
import { submissionRouter } from "./api/routes/submission.route.ts";
import cors from "cors";

export const app = express();
app.use(cors({ origin: "*" }))
app.use(express.json());

app.use('/callback', callbackRouter)
app.use('/submission', submissionRouter)

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("Server running on port 4000");
})