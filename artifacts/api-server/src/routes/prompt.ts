import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { storage } from "../storage";
import { getAuth } from "@clerk/express";
import { sendEmail, quotaWarningEmail, quotaExhaustedEmail } from "../emailClient";

const router = Router();

router.post("/prompt/multi", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const auth = getAuth(req);
    const userId = auth?.userId;

    if (userId) {
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({ id: userId });
      }
      if (user.promptsUsed >= user.promptsLimit) {
        res.status(402).json({
          error: "quota_exceeded",
          message: "You've used all your free prompts. Upgrade to Pro for unlimited access.",
          promptsUsed: user.promptsUsed,
          promptsLimit: user.promptsLimit,
          plan: user.plan,
        });
        return;
      }
    }

    const title = prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt;

    const [openaiConv] = await db.insert(conversations).values({ title }).returning();
    const [anthropicConv] = await db.insert(conversations).values({ title }).returning();
    const [geminiConv] = await db.insert(conversations).values({ title }).returning();

    if (userId) {
      const updated = await storage.incrementPromptsUsed(userId);
      if (updated?.email) {
        const used = updated.promptsUsed;
        const limit = updated.promptsLimit;
        const pct = used / limit;
        if (used >= limit) {
          const tpl = quotaExhaustedEmail();
          sendEmail({ to: updated.email, ...tpl });
        } else if (pct >= 0.8 && pct < 1) {
          const tpl = quotaWarningEmail({ used, limit });
          sendEmail({ to: updated.email, ...tpl });
        }
      }
    }

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

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "getConversationMessages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
