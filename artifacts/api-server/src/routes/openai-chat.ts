import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getAuth } from "@clerk/express";

const router = Router();

function buildSystemPrompt(tone?: string, length?: string): string | null {
  const toneParts: Record<string, string> = {
    professional: "Respond formally and with precision. Use technical language where appropriate.",
    casual: "Respond conversationally and accessibly. Keep your tone warm and friendly.",
    creative: "Respond creatively with vivid language, analogies, and unexpected angles.",
    socratic: "Guide the user's thinking with probing questions rather than giving direct answers.",
  };
  const lengthParts: Record<string, string> = {
    concise: "Be extremely concise. Get to the core point quickly. Minimize words.",
    detailed: "Be thorough and well-structured. Use examples and clear explanations.",
    exhaustive: "Provide an exhaustive, deeply structured response. Use headers, cover every angle.",
  };
  const parts = [
    tone && tone !== "default" ? toneParts[tone] : null,
    length && length !== "standard" ? lengthParts[length] : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

router.post("/openai/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createOpenaiConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listOpenaiConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (conv.userId !== "unknown" && conv.userId !== "guest" && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, imageBase64, imageMimeType, mode, temperature, length, tone, frequencyPenalty, presencePenalty } = req.body as {
      content: string;
      imageBase64?: string;
      imageMimeType?: string;
      mode?: string;
      temperature?: number;
      length?: string;
      tone?: string;
      frequencyPenalty?: number;
      presencePenalty?: number;
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

    const sysPrompt = buildSystemPrompt(tone, length);
    const finalMessages = sysPrompt
      ? [{ role: "system" as const, content: sysPrompt }, ...chatMessages]
      : chatMessages;

    let fullResponse = "";

    const isReasoning = mode === "think" || mode === "deep";
    const lengthTokens: Record<string, number> = { concise: 1024, detailed: 16384, exhaustive: 32768 };
    const modeTokens = mode === "deep" ? 32768 : mode === "think" ? 16384 : 8192;
    const maxToks = length && length !== "standard" ? (lengthTokens[length] ?? modeTokens) : modeTokens;

    const createParams: Record<string, unknown> = {
      model: isReasoning ? "o3" : "gpt-5.4",
      max_completion_tokens: maxToks,
      messages: finalMessages,
      stream: true,
    };
    if (isReasoning) createParams.reasoning_effort = mode === "deep" ? "high" : "medium";
    if (!isReasoning && temperature != null) createParams.temperature = temperature;
    if (!isReasoning && frequencyPenalty) createParams.frequency_penalty = frequencyPenalty;
    if (!isReasoning && presencePenalty) createParams.presence_penalty = presencePenalty;

    const stream = openai.chat.completions.create(createParams as any) as unknown as AsyncIterable<{ choices: { delta: { content?: string } }[] }>;

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
