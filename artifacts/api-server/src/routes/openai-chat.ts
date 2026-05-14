import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/openai/conversations", async (req, res) => {
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation" }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createOpenaiConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listOpenaiConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
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

    // Collapse consecutive same-role messages (keeps last of each run).
    // Prevents API rejection when a previous stream failed without saving an assistant reply.
    const normalized = existingMessages.filter((m, i, arr) => i === arr.length - 1 || arr[i + 1].role !== m.role);

    type ChatMsg = {
      role: "user" | "assistant";
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };

    const chatMessages: ChatMsg[] = normalized.map((m, idx) => {
      const isLastUser = idx === normalized.length - 1 && m.role === "user" && imageBase64;
      if (isLastUser) {
        return {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` } },
            { type: "text", text: textContent || "Describe this image." },
          ],
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "sendOpenaiMessage error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
