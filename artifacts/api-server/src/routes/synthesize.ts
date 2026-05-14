import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

type SynthesisMode = "factual" | "creative" | "code";

function detectMode(question: string, responses: Array<{ content: string }>): SynthesisMode {
  const allContent = responses.map((r) => r.content).join("\n");
  if ((allContent.match(/```/g) || []).length >= 2) return "code";
  const creativePattern =
    /\b(write|writing|story|poem|poetry|essay|creative|fiction|narrative|compose|draft|blog|article|letter|speech|imagine|invent|describe)\b/i;
  if (creativePattern.test(question)) return "creative";
  return "factual";
}

const SYSTEM_PROMPTS: Record<SynthesisMode, string> = {
  factual: `You are a Synthesis AI — your role is to read multiple AI responses to the same question and produce a single, authoritative consensus answer.

Your synthesis should:
1. Identify and consolidate points of agreement across all responses
2. Surface unique insights that only one AI mentioned but are valuable
3. Resolve any contradictions by reasoning through them
4. Be concise yet comprehensive — the best possible answer

Do not label which AI said what. Write as a single unified voice. Begin immediately with the answer, no preamble.`,

  code: `You are a Code Synthesis AI — your role is to review multiple code implementations of the same problem and produce the single optimal solution.

Your synthesis should:
1. Identify the best overall approach and structure
2. Incorporate superior techniques or edge-case handling from other implementations
3. Produce clean, correct, well-commented final code
4. Briefly note any meaningful differences in approach worth knowing

Write the final code first, then any explanatory notes. No preamble.`,

  creative: `You are a Creative Synthesis AI — your role is to read multiple creative writing responses and weave them into one single polished piece.

Your synthesis should:
1. Identify the strongest ideas, imagery, phrasing, and narrative elements from each response
2. Combine them into one cohesive, well-crafted piece that elevates the best parts of each
3. Maintain a consistent voice and tone throughout
4. Do NOT summarize or average the responses — produce something genuinely excellent

Begin immediately with the creative work. No preamble or explanation.`,
};

router.post("/synthesize", async (req, res) => {
  try {
    const { question, responses, imageBase64, imageMimeType } = req.body as {
      question: string;
      responses: Array<{ name: string; content: string }>;
      imageBase64?: string;
      imageMimeType?: string;
    };

    if (!responses || responses.length === 0) {
      res.status(400).json({ error: "responses are required" });
      return;
    }

    const mode = detectMode(question, responses);
    const systemPrompt = SYSTEM_PROMPTS[mode];

    const formattedResponses = responses
      .map((r) => `## ${r.name}\n${r.content}`)
      .join("\n\n---\n\n");

    const textContent = `Question asked: "${question}"\n\nAI Responses:\n\n${formattedResponses}\n\nSynthesize these into one definitive answer:`;

    const userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> =
      imageBase64
        ? [
            { type: "text", text: textContent },
            {
              type: "image_url",
              image_url: { url: `data:${imageMimeType ?? "image/jpeg"};base64,${imageBase64}` },
            },
          ]
        : textContent;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent as string },
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
