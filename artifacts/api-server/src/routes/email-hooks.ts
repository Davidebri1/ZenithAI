import { Router } from "express";
import { getAuth } from "@clerk/express";
import { storage } from "../storage";
import { sendEmail, welcomeEmail } from "../emailClient";
import { logger } from "../lib/logger";

const router = Router();

// Called by the app on first sign-in to trigger welcome email
// Idempotent — only sends once (checks if user already exists in DB)
router.post("/email/welcome", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const existing = await storage.getUser(userId);
    if (existing) {
      // Already welcomed — skip
      res.json({ sent: false, reason: "already_welcomed" });
      return;
    }

    const { email, name } = req.body as { email?: string; name?: string };
    if (!email) { res.json({ sent: false, reason: "no_email" }); return; }

    const user = await storage.upsertUser({ id: userId, email });
    const tpl = welcomeEmail({ name });
    await sendEmail({ to: email, ...tpl });

    logger.info({ userId }, "Welcome email sent");
    res.json({ sent: true });
  } catch (err) {
    logger.error({ err }, "email/welcome error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
