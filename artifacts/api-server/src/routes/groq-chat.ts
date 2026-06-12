import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import OpenAI from "openai";
import { getAuth } from "@clerk/express";
import { openrouter } from "@workspace/integrations-openrouter-ai";

const router = Router();

// Groq uses the OpenAI-compatible API
const GROQ_KEY_PRIMARY = process.env.GROQ_API_KEY ?? "";
const GROQ_KEY_SECONDARY = process.env.GROQ_API_KEY_2 ?? "";

const groqPrimary = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: GROQ_KEY_PRIMARY,
});

const groqSecondary = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: GROQ_KEY_SECONDARY,
});

// Model mapping: provider key → Groq model name
const GROQ_MODEL_MAP: Record<string, { standard: string; think: string; deep: string }> = {
  llama: {
    standard: "llama-3.3-70b-versatile",
    think: "llama-3.3-70b-versatile",
    deep: "llama-3.3-70b-versatile",
  },
  mistral: {
    standard: "mixtral-8x7b-32768",
    think: "mixtral-8x7b-32768",
    deep: "mixtral-8x7b-32768",
  },
};

// OpenRouter fallback models
const OR_FALLBACK_MAP: Record<string, { standard: string; think: string; deep: string }> = {
  llama: {
    standard: "meta-llama/llama-4-scout",
    think: "meta-llama/llama-4-maverick",
    deep: "meta-llama/llama-4-maverick",
  },
  mistral: {
    standard: "mistralai/mistral-small-3.1-24b-instruct",
    think: "mistralai/mistral-large-2411",
    deep: "mistralai/mistral-large-2411",
  },
};

const GROQ_PROVIDERS = Object.keys(GROQ_MODEL_MAP);

function isGroqProvider(provider: string): boolean {
  return GROQ_PROVIDERS.includes(provider);
}

async function streamWithGroq(
  client: OpenAI,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: any }>,
  maxTokens: number,
  temperature?: number
): Promise<AsyncIterable<{ choices: { delta: { content?: string } }[] }>> {
  return client.chat.completions.create({
    model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    ...(temperature != null ? { temperature } : {}),
  }) as unknown as AsyncIterable<{ choices: { delta: { content?: string } }[] }>;
}

router.post("/:provider/groq/conversations", async (req, res) => {
  if (!isGroqProvider(req.params.provider)) { res.status(404).json({ error: "Unknown provider" }); return; }
  const userId = getAuth(req)?.userId ?? "guest";
  try {
    const { title } = req.body as { title: string };
    const [conv] = await db.insert(conversations).values({ title: title || "New Conversation", userId }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error({ err }, "createGroqConversation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:provider/groq/conversations/:id/messages", async (req, res) => {
  const provider = req.params.provider;
  if (!isGroqProvider(provider)) { res.status(404).json({ error: "Unknown provider" }); return; }
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

    const textContent = content || "";
    const storedContent = imageBase64 ? `${textContent}${textContent ? "\n\n" : ""}[📷 Image attached]` : textContent;
    await db.insert(messages).values({ conversationId: id, role: "user", content: storedContent });

    const existing = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    const normalized = existing.filter((m, i, arr) => i === arr.length - 1 || arr[i + 1].role !== m.role);

    type ChatMsg = { role: "user" | "assistant" | "system"; content: any };
    const chatMessages: ChatMsg[] = normalized.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const groqModels = GROQ_MODEL_MAP[provider];
    const modeKey = (mode as "standard" | "think" | "deep") ?? "standard";
    const selectedModel = groqModels[modeKey] ?? groqModels.standard;

    const MODE_TOKENS: Record<string, number> = { standard: 8192, think: 16384, deep: 32768 };
    const lengthTokenMap: Record<string, number> = { concise: 1024, detailed: 16384, exhaustive: 32768 };
    const modeTokens = MODE_TOKENS[modeKey] ?? 8192;
    const maxTokens = length && length !== "standard" ? (lengthTokenMap[length] ?? modeTokens) : modeTokens;

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
    const finalMessages = sysContent ? [{ role: "system" as const, content: sysContent }, ...chatMessages] : chatMessages;

    let fullResponse = "";
    let streamSucceeded = false;

    // Try Groq primary key first
    for (const groqClient of [groqPrimary, groqSecondary]) {
      try {
        const stream = await streamWithGroq(groqClient, selectedModel, finalMessages, maxTokens, temperature);
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        }
        streamSucceeded = true;
        break;
      } catch (groqErr) {
        req.log.warn({ groqErr }, `Groq ${selectedModel} failed, trying fallback`);
        fullResponse = "";
      }
    }

    // Fallback to OpenRouter if Groq failed
    if (!streamSucceeded) {
      try {
        const fallbackModel = OR_FALLBACK_MAP[provider]?.[modeKey] ?? OR_FALLBACK_MAP[provider]?.standard;
        if (fallbackModel) {
          const orStream = await openrouter.chat.completions.create({
            model: fallbackModel,
            messages: finalMessages as any,
            stream: true,
            max_tokens: maxTokens,
            ...(temperature != null ? { temperature } : {}),
          });
          for await (const chunk of orStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          }
          streamSucceeded = true;
        }
      } catch (orErr) {
        req.log.error({ orErr }, "OpenRouter fallback also failed");
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "groqChat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export { isGroqProvider, GROQ_PROVIDERS };
export default router;
