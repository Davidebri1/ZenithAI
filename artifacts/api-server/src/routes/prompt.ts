import { Router } from "express";
import { db } from "@workspace/db";
import { conversations } from "@workspace/db";

const router = Router();

router.post("/prompt/multi", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const title = prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt;

    const [openaiConv] = await db.insert(conversations).values({ title }).returning();
    const [anthropicConv] = await db.insert(conversations).values({ title }).returning();
    const [geminiConv] = await db.insert(conversations).values({ title }).returning();

    res.json({
      openaiConversationId: openaiConv.id,
      anthropicConversationId: anthropicConv.id,
      geminiConversationId: geminiConv.id,
    });
  } catch (err) {
    req.log.error({ err }, "prompt/multi error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
