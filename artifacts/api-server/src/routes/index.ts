import { Router, type IRouter } from "express";
import healthRouter from "./health";
import promptRouter from "./prompt";
import openaiChatRouter from "./openai-chat";
import anthropicChatRouter from "./anthropic-chat";
import geminiChatRouter from "./gemini-chat";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(promptRouter);
router.use(openaiChatRouter);
router.use(anthropicChatRouter);
router.use(geminiChatRouter);
router.use(searchRouter);

export default router;
