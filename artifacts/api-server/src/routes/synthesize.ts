import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/synthesize", async (req, res) => {
  try {
    const { question, responses } = req.body as {
      question: string;
      responses: Array<{ name: string; content: string }>;
    };

    if (!responses || responses.length === 0) {
      res.status(400).json({ error: "responses are required" });
      return;
    }

    const formattedResponses = responses
      .map((r) => `## ${r.name}\n${r.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a Synthesis AI — your role is to read multiple AI responses to the same question and produce a single, authoritative consensus answer. 

Your synthesis should:
1. Identify and consolidate points of agreement across all responses
2. Surface unique insights that only one AI mentioned but are valuable
3. Resolve any contradictions by reasoning through them
4. Be concise yet comprehensive — the best possible answer

Do not label which AI said what. Write as a single unified voice. Begin immediately with the answer, no preamble.`;

    const userPrompt = `Question asked: "${question}"

AI Responses:

${formattedResponses}

Synthesize these into one definitive answer:`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "synthesize error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Synthesis failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
