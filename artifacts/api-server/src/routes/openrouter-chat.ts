import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { getAuth } from "@clerk/express";
import { requirePlan } from "../lib/planCheck";

const router = Router();

// Paid models — require pro plan
const PAID_MODEL_MAP: Record<string, string> = {
  grok: "x-ai/grok-3-beta",
  deepseek: "deepseek/deepseek-chat-v3-0324",
  mistral: "mistralai/mistral-large-2411",
  llama: "meta-llama/llama-4-maverick",
  qwen: "qwen/qwen3-235b-a22b",
};

// Free models — no plan check, routed via /:provider/free
const FREE_MODEL_MAP: Record<string, string> = {
  gemma: "google/gemma-3-27b-it:free",
  phi: "microsoft/phi-4:free",
  "deepseek-free": "deepseek/deepseek-chat-v3-0324:free",
  "qwen-free": "qwen/qwen3-30b-a3b:free",
};

function getModel(provider: string): string | null {
  return PAID_MODEL_MAP[provider] ?? null;
}

function getFreeModel(provider: string): string | null {
  return FREE_MODEL_MAP[provider] ?? null;
}

// === FREE model routes (no plan check) ===
router.post("/:provider/free/conversations", async (req, res) => {
  const model = getFreeModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown free provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createFreeOpenrouterConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:provider/free/conversations", async (req, res) => {
  const model = getFreeModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown free provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listFreeOpenrouterConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:provider/free/conversations/:id/messages", async (req, res) => {
  const model = getFreeModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown free provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (conv.userId !== "unknown" && conv.userId !== "guest" && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, mode, temperature, length, tone, safeMode, memoryContext } = req.body as {
      content: string;
      mode?: string;
      temperature?: number;
      length?: string;
      tone?: string;
      safeMode?: boolean;
      memoryContext?: string;
    };

    if (!content) { res.status(400).json({ error: "content is required" }); return; }

    await db.insert(messages).values({ conversationId: id, role: "user", content });

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));

    const normalized = existingMessages.filter((m, i, arr) => i === arr.length - 1 || arr[i + 1].role !== m.role);

    const toneParts: Record<string, string> = {
      professional: "Respond formally and with precision.",
      casual: "Respond conversationally and accessibly.",
      creative: "Respond creatively with vivid language.",
      socratic: "Guide the user's thinking with probing questions.",
    };
    const lengthParts: Record<string, string> = {
      concise: "Be extremely concise.",
      detailed: "Be thorough and well-structured.",
      exhaustive: "Provide an exhaustive response.",
    };
    const sysParts = [
      tone && tone !== "default" ? toneParts[tone] : null,
      length && length !== "standard" ? lengthParts[length] : null,
      memoryContext || null,
    ].filter(Boolean);
    const sysPrompt = sysParts.length > 0 ? sysParts.join(" ") : null;

    const chatMessages = normalized.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const finalMessages = sysPrompt
      ? [{ role: "system" as const, content: sysPrompt }, ...chatMessages]
      : chatMessages;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const lengthTokens: Record<string, number> = { concise: 1024, detailed: 8192, exhaustive: 16384 };
    const modeTokens = mode === "deep" ? 16384 : mode === "think" ? 8192 : 4096;
    const maxToks = length && length !== "standard" ? (lengthTokens[length] ?? modeTokens) : modeTokens;

    let fullResponse = "";

    const stream = openrouter.chat.completions.create({
      model,
      max_tokens: maxToks,
      messages: finalMessages,
      stream: true,
      ...(temperature != null ? { temperature } : {}),
    }) as unknown as AsyncIterable<{ choices: { delta: { content?: string } }[] }>;

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
    req.log.error({ err }, "sendFreeOpenrouterMessage error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

// === PAID model routes (require pro plan) ===
router.post("/:provider/conversations", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createOpenrouterConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:provider/conversations", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "listOpenrouterConversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:provider/conversations/:id/messages", async (req, res) => {
  const model = getModel(req.params.provider);
  if (!model) { res.status(404).json({ error: "Unknown provider" }); return; }
  const allowed = await requirePlan(req, res, "pro");
  if (!allowed) return;
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) { res.status(400).json({ error: "Invalid conversation id" }); return; }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (conv.userId !== "unknown" && conv.userId !== "guest" && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, imageBase64, imageMimeType, mode, temperature, length, tone, safeMode, memoryContext } = req.body as {
      content: string;
      imageBase64?: string;
      imageMimeType?: string;
      mode?: string;
      temperature?: number;
      length?: string;
      tone?: string;
      safeMode?: boolean;
      memoryContext?: string;
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

    const MODE_MODELS: Record<string, Partial<Record<string, string>>> = {
      grok:     { standard: "x-ai/grok-3-beta",              think: "x-ai/grok-3-mini-beta",           deep: "x-ai/grok-3-beta"               },
      deepseek: { standard: "deepseek/deepseek-chat-v3-0324", think: "deepseek/deepseek-r1",            deep: "deepseek/deepseek-r1"            },
      mistral:  { standard: "mistralai/mistral-small-3.1-24b-instruct", think: "mistralai/mistral-large-2411", deep: "mistralai/mistral-large-2411" },
      llama:    { standard: "meta-llama/llama-4-scout",       think: "meta-llama/llama-4-maverick",     deep: "meta-llama/llama-4-maverick"     },
      qwen:     { standard: "qwen/qwen3-235b-a22b",           think: "qwen/qwq-32b",                   deep: "qwen/qwq-32b"                    },
    };
    const MODE_TOKENS: Record<string, number> = { standard: 8192, think: 16384, deep: 32768 };
    const selectedModel = MODE_MODELS[req.params.provider]?.[mode ?? "standard"] ?? model;
    const maxTokens = MODE_TOKENS[mode ?? "standard"] ?? 8192;

    const toneParts: Record<string, string> = {
      professional: "Respond formally and with precision.",
      casual: "Respond conversationally and accessibly.",
      creative: "Respond creatively with vivid language and unexpected angles.",
      socratic: "Guide the user's thinking with probing questions rather than direct answers.",
    };
    const lengthParts: Record<string, string> = {
      concise: "Be extremely concise. Get to the core point quickly.",
      detailed: "Be thorough and well-structured. Use examples.",
      exhaustive: "Provide an exhaustive structured response. Use headers, cover every angle.",
    };
    const sysParts = [
      tone && tone !== "default" ? toneParts[tone] : null,
      length && length !== "standard" ? lengthParts[length] : null,
      safeMode ? "Keep all responses safe and appropriate for all audiences." : null,
      memoryContext || null,
    ].filter(Boolean);
    const sysContent = sysParts.join(" ");

    const finalMessages = sysContent
      ? [{ role: "system" as const, content: sysContent }, ...chatMessages]
      : chatMessages;

    const lengthTokenMap: Record<string, number> = { concise: 1024, detailed: 16384, exhaustive: 32768 };
    const resolvedMax = length && length !== "standard" ? (lengthTokenMap[length] ?? maxTokens) : maxTokens;

    let fullResponse = "";

    const stream = await openrouter.chat.completions.create({
      model: selectedModel,
      max_tokens: resolvedMax,
      ...(temperature != null ? { temperature } : {}),
      messages: finalMessages as any,
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
