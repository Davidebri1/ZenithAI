import { Router } from "express";
import { storage } from "../storage";
import { getAuth } from "@clerk/express";
import { sendEmail, quotaExhaustedEmail, quotaWarningEmail } from "../emailClient";
import { db } from "@workspace/db";
import { conversations } from "@workspace/db";

const router = Router();

router.post("/prompt/track", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;

    if (!userId) {
      res.json({ tracked: false });
      return;
    }

    let user = await storage.getUser(userId);
    if (!user) {
      user = await storage.upsertUser({ id: userId });
    }

    if (user.promptsUsed >= user.promptsLimit) {
      res.status(402).json({
        error: "quota_exceeded",
        message: "You've used all your free prompts. Upgrade to Pro for more.",
        promptsUsed: user.promptsUsed,
        promptsLimit: user.promptsLimit,
        plan: user.plan,
      });
      return;
    }

    const updated = await storage.incrementPromptsUsed(userId);

    if (updated?.email && updated.promptsUsed >= updated.promptsLimit) {
      const tpl = quotaExhaustedEmail();
      sendEmail({ to: updated.email, ...tpl });
    }

    res.json({
      tracked: true,
      promptsUsed: updated.promptsUsed,
      promptsLimit: updated.promptsLimit,
      plan: updated.plan,
      remaining: Math.max(0, updated.promptsLimit - updated.promptsUsed),
    });
  } catch (err) {
    req.log.error({ err }, "prompt/track error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { messages } = await import("@workspace/db");
    const { eq, asc } = await import("drizzle-orm");
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
