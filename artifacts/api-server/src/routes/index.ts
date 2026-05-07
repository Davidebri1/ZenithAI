import { Router, type IRouter } from "express";
import healthRouter from "./health";
import promptRouter from "./prompt";
import openaiChatRouter from "./openai-chat";
import anthropicChatRouter from "./anthropic-chat";
import geminiChatRouter from "./gemini-chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(promptRouter);
router.use(openaiChatRouter);
router.use(anthropicChatRouter);
router.use(geminiChatRouter);

export default router;
