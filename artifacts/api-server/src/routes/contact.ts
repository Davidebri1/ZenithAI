import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { inquiries } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

router.post("/contact", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId ?? null;
    const { name, company, message } = req.body as {
      name?: string;
      company?: string;
      message?: string;
    };

    if (!name?.trim() || !message?.trim()) {
      res.status(400).json({ error: "name and message are required" });
      return;
    }

    await db.insert(inquiries).values({
      userId,
      name: name.trim(),
      company: company?.trim() ?? null,
      message: message.trim(),
    });

    logger.info({ userId, company }, "Enterprise inquiry received");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "contact route error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
