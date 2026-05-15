import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
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

router.post("/anthropic/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createAnthropicConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/anthropic/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listAnthropicConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (conv.userId !== "unknown" && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, imageBase64, imageMimeType, mode, temperature, length, tone, topK } = req.body as {
      content: string;
      imageBase64?: string;
      imageMimeType?: string;
      mode?: string;
      temperature?: number;
      length?: string;
      tone?: string;
      topK?: number;
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
    // Anthropic strictly requires alternating user/assistant turns.
    const normalized = existingMessages.filter((m, i, arr) => i === arr.length - 1 || arr[i + 1].role !== m.role);

    type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    type AnthropicContent =
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image"; source: { type: "base64"; media_type: AnthropicMediaType; data: string } }
        >;

    const chatMessages: Array<{ role: "user" | "assistant"; content: AnthropicContent }> =
      normalized.map((m, idx) => {
        const isLastUser = idx === normalized.length - 1 && m.role === "user" && imageBase64;
        if (isLastUser) {
          return {
            role: "user" as const,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: (imageMimeType || "image/jpeg") as AnthropicMediaType,
                  data: imageBase64,
                },
              },
              { type: "text" as const, text: textContent || "Describe this image." },
            ],
          };
        }
        return { role: m.role as "user" | "assistant", content: m.content };
      });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sysPrompt = buildSystemPrompt(tone, length);
    let fullResponse = "";
    const useThinking = mode === "think" || mode === "deep";
    const thinkBudget  = mode === "deep" ? 32000 : 10000;
    const lengthTokens: Record<string, number> = { concise: 1024, detailed: 16384, exhaustive: 32768 };
    const modeMaxToks  = mode === "deep" ? 32000 : mode === "think" ? 16000 : 8192;
    const maxToks = length && length !== "standard" ? (lengthTokens[length] ?? modeMaxToks) : modeMaxToks;

    const streamParams: Parameters<typeof anthropic.messages.stream>[0] = {
      model: "claude-sonnet-4-6",
      max_tokens: maxToks,
      ...(sysPrompt ? { system: sysPrompt } : {}),
      ...(temperature != null ? { temperature: Math.min(temperature, 1) } : {}),
      ...(topK != null ? { top_k: topK } : {}),
      messages: chatMessages,
      ...(useThinking ? { thinking: { type: "enabled" as const, budget_tokens: thinkBudget } } : {}),
    };

    const stream = anthropic.messages.stream(streamParams);

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "sendAnthropicMessage error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
