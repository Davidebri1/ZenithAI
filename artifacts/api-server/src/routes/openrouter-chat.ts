import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router = Router();

const MODEL_MAP: Record<string, string> = {
  grok: "x-ai/grok-3-beta",
  deepseek: "deepseek/deepseek-chat-v3-0324",
  mistral: "mistralai/mistral-large-2411",
  llama: "meta-llama/llama-4-maverick",
  qwen: "qwen/qwen3-235b-a22b",
};

function getModel(provider: string): string | null {
  return MODEL_MAP[provider] ?? null;
}

router.post("/:provider/conversations", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation" }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createOpenrouterConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:provider/conversations", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
  try {
    const convs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listOpenrouterConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:provider/conversations/:id/messages", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
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

    type ChatMsg = {
      role: "user" | "assistant";
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };

    const chatMessages: ChatMsg[] = existingMessages.map((m, idx) => {
      const isLastUser = idx === existingMessages.length - 1 && m.role === "user" && imageBase64;
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

    const stream = await openrouter.chat.completions.create({
      model,
      max_tokens: 8192,
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
    req.log.error({ err }, "sendOpenrouterMessage error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
