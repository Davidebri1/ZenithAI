# MultiAI

A mobile app that lets you type one prompt and simultaneously get streaming responses from ChatGPT (GPT-5.4), Claude (Sonnet 4.6), and Gemini (Flash 3), displayed side by side.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/multi-ai run dev` — Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with expo-router, AsyncStorage for session history
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`conversations`, `messages` tables)
- AI: OpenAI gpt-5.4, Anthropic claude-sonnet-4-6, Gemini gemini-3-flash-preview via Replit AI Integrations
- Validation: Zod, drizzle-zod
- Streaming: SSE via `expo/fetch` on mobile

## Where things live

- `artifacts/multi-ai/` — Expo mobile app
- `artifacts/api-server/` — Express API server
- `artifacts/api-server/src/routes/prompt.ts` — POST /api/prompt/multi (creates 3 conversations)
- `artifacts/api-server/src/routes/openai-chat.ts` — OpenAI SSE streaming
- `artifacts/api-server/src/routes/anthropic-chat.ts` — Anthropic SSE streaming
- `artifacts/api-server/src/routes/gemini-chat.ts` — Gemini SSE streaming
- `lib/db/src/schema/` — DB schema (conversations + messages)
- `lib/api-spec/openapi.yaml` — OpenAPI contract

## Architecture decisions

- Single shared `conversations`/`messages` table for all 3 AI providers (differentiated by conversation ID, not provider field)
- `/api/prompt/multi` creates 3 conversation rows then returns IDs; client fires 3 parallel SSE streams
- SSE consumed via `expo/fetch` (not EventSource) so POST+streaming works on React Native
- Session history stored in AsyncStorage for offline access and fast load
- No auth — single-user personal tool

## Product

- Type a prompt, get simultaneous streaming responses from GPT-5.4, Claude Sonnet, and Gemini Flash
- Session history stored locally — revisit past comparisons anytime
- Dark-friendly theme with distinct color branding per AI (green/orange/blue)

## User preferences

_Populate as you build._

## Gotchas

- Run codegen with `cd lib/api-spec && npx orval --config ./orval.config.ts` if `pnpm --filter @workspace/api-spec run codegen` fails (typecheck:libs in the batch script has known false-positive TS errors in integration libs)
- Expo web preview may look different from native — native (Expo Go) is the source of truth
- AI integration env vars are auto-managed by Replit; do NOT modify them manually

## Pointers

- See `pnpm-workspace` skill for workspace structure
- See `ai-integrations-openai`, `ai-integrations-anthropic`, `ai-integrations-gemini` skills for AI SDK usage
