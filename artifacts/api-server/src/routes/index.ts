import { Router, type IRouter } from "express";
import healthRouter from "./health";
import promptRouter from "./prompt";
import openaiChatRouter from "./openai-chat";
import anthropicChatRouter from "./anthropic-chat";
import geminiChatRouter from "./gemini-chat";
import openrouterChatRouter from "./openrouter-chat";
import groqChatRouter from "./groq-chat";
import synthesizeRouter from "./synthesize";
import searchRouter from "./search";
import stripeRouter from "./stripe";
import contactRouter from "./contact";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);

// Stripe routes (authenticated)
router.use(requireAuth);
router.use(stripeRouter);
router.use(contactRouter);

// All other authenticated routes
router.use(promptRouter);
router.use(openaiChatRouter);
router.use(anthropicChatRouter);
router.use(geminiChatRouter);
router.use(synthesizeRouter);
router.use(searchRouter);
// Groq-backed routes (llama, mistral) with OpenRouter fallback
router.use(groqChatRouter);
// OpenRouter routes for remaining providers (grok, deepseek, qwen)
router.use(openrouterChatRouter);

export default router;
