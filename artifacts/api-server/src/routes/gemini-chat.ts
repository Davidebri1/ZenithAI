import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.post("/gemini/conversations", async (req, res) => {
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation" }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createGeminiConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gemini/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listGeminiConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gemini/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { content, imageBase64, imageMimeType } = req.body as {
      content: string;
      imageBase64?: string;
      imageMimeType?: string;
    };

    if ((content === undefined || content === null) && !imageBase64) {
      res.status(400).json({ error: "content or image is required" });
      return;
    }

    const textContent = content || "";
    const storedContent = imageBase64
      ? `${textContent}${textContent ? "\n\n" : ""}[📷 Image attached]`
      : textContent;

    await db.insert(messages).values({ conversationId: id, role: "user", content: storedContent });

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
    type GeminiMsg = { role: "user" | "model"; parts: GeminiPart[] };

    const chatMessages: GeminiMsg[] = existingMessages.map((m, idx) => {
      const isLastUser = idx === existingMessages.length - 1 && m.role === "user" && imageBase64;
      const role = m.role === "assistant" ? ("model" as const) : ("user" as const);
      if (isLastUser) {
        const parts: GeminiPart[] = [
          { inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } },
        ];
        if (textContent) parts.push({ text: textContent });
        else parts.push({ text: "Describe this image." });
        return { role, parts };
      }
      return { role, parts: [{ text: m.content }] };
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: chatMessages,
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "sendGeminiMessage error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
