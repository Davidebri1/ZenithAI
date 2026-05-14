import { Router, type IRouter } from "express";
import healthRouter from "./health";
import promptRouter from "./prompt";
import openaiChatRouter from "./openai-chat";
import anthropicChatRouter from "./anthropic-chat";
import geminiChatRouter from "./gemini-chat";
import openrouterChatRouter from "./openrouter-chat";
import synthesizeRouter from "./synthesize";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(promptRouter);
router.use(openaiChatRouter);
router.use(anthropicChatRouter);
router.use(geminiChatRouter);
router.use(synthesizeRouter);
router.use(searchRouter);
router.use(openrouterChatRouter);

export default router;
