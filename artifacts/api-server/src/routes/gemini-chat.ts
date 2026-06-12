import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
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

router.post("/gemini/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createGeminiConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gemini/conversations", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listGeminiConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gemini/conversations/:id/messages", async (req, res) => {
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (conv.userId !== "unknown" && conv.userId !== "guest" && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, imageBase64, imageMimeType, mode, temperature, length, tone, topK, safetyLevel } = req.body as {
      content: string;
      imageBase64?: string;
      imageMimeType?: string;
      mode?: string;
      temperature?: number;
      length?: string;
      tone?: string;
      topK?: number;
      safetyLevel?: string;
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
    const normalized = existingMessages.filter((m, i, arr) => i === arr.length - 1 || arr[i + 1].role !== m.role);

    type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
    type GeminiMsg = { role: "user" | "model"; parts: GeminiPart[] };

    const chatMessages: GeminiMsg[] = normalized.map((m, idx) => {
      const isLastUser = idx === normalized.length - 1 && m.role === "user" && imageBase64;
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

    const sysPrompt = buildSystemPrompt(tone, length);
    let fullResponse = "";

    const lengthTokens: Record<string, number> = { concise: 1024, detailed: 16384, exhaustive: 32768 };
    const modeToks = mode === "deep" ? 32768 : mode === "think" ? 16384 : 8192;
    const maxOutputTokens = length && length !== "standard" ? (lengthTokens[length] ?? modeToks) : modeToks;

    const geminiConfig: Record<string, unknown> = { maxOutputTokens };
    if (temperature != null) geminiConfig.temperature = Math.min(temperature, 2);
    if (topK != null) geminiConfig.topK = topK;
    if (mode === "think") geminiConfig.thinkingConfig = { thinkingBudget: 8000 };
    if (mode === "deep")  geminiConfig.thinkingConfig = { thinkingBudget: 24576 };
    if (safetyLevel) {
      const threshold = safetyLevel === "block_few" ? "BLOCK_ONLY_HIGH" : safetyLevel === "block_most" ? "BLOCK_LOW_AND_ABOVE" : "BLOCK_MEDIUM_AND_ABOVE";
      geminiConfig.safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT",        threshold },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold },
      ];
    }

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: chatMessages,
      ...(sysPrompt ? { systemInstruction: sysPrompt } : {}),
      config: geminiConfig,
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
