import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { inquiries } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendEmail, contactAutoReplyEmail } from "../emailClient";

const router = Router();

router.post("/contact", async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId ?? null;
    const { name, company, message, email } = req.body as {
      name?: string;
      company?: string;
      message?: string;
      email?: string;
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

    // Send auto-reply if we have their email
    if (email?.trim()) {
      const submittedAt = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });
      const tpl = contactAutoReplyEmail({
        name: name.trim(),
        company: company?.trim() ?? null,
        message: message.trim(),
        submittedAt,
      });
      sendEmail({ to: email.trim(), ...tpl });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "contact route error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
