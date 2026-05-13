import { Router } from "express";
import { db, messages } from "@workspace/db";
import { ilike, desc } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 2) {
      res.json([]);
      return;
    }

    const results = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        content: messages.content,
        role: messages.role,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(ilike(messages.content, `%${q}%`))
      .orderBy(desc(messages.createdAt))
      .limit(40);

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "search error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
