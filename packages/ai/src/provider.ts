import { createOpenAI } from "@ai-sdk/openai";

// This package's tsconfig targets DOM libs and does not pull in @types/node, so
// reach `process.env` through globalThis rather than the ambient `process`. At
// runtime this module only loads inside the Node agents server, where it exists.
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/**
 * Model provider for the agents server. We target Ollama Cloud, which exposes
 * an OpenAI-compatible API, through the AI SDK's OpenAI provider with a custom
 * `baseURL`. `compatibility: "compatible"` restricts requests to the portable
 * subset Ollama implements (no OpenAI-only features like strict structured
 * outputs), so `streamText`/`generateObject` behave against Ollama models.
 *
 * Env (agents server only — `apps/agents/.env`):
 *   OLLAMA_API_KEY   Bearer key from https://ollama.com (required in prod).
 *   OLLAMA_BASE_URL  Override endpoint; defaults to Ollama Cloud.
 *   OLLAMA_MODEL     Default model tag for every call (see DEFAULT_MODEL).
 */
const baseURL = env.OLLAMA_BASE_URL ?? "https://ollama.com/v1";

const ollama = createOpenAI({
  baseURL,
  apiKey: env.OLLAMA_API_KEY ?? "",
  // Ollama is not the real OpenAI API — keep to the portable request shape.
  compatibility: "compatible",
});

/**
 * The single configurable default model. Override with OLLAMA_MODEL. Ollama
 * model tags (e.g. `qwen3`, `llama3.3`) differ from Anthropic's IDs, so if the
 * tag your account exposes differs from the default below, set OLLAMA_MODEL.
 */
export const DEFAULT_MODEL = env.OLLAMA_MODEL ?? "qwen3.6";

/**
 * Resolve a request's model id to a real Ollama model. Callers historically
 * pass Anthropic ids (`claude-*`, via the `MODELS` map or an old client). Those
 * ids mean nothing to Ollama, so we normalize any `claude-*` id — and any empty
 * id — to DEFAULT_MODEL. A caller that passes a genuine Ollama tag gets it
 * verbatim, so per-request model selection still works.
 */
export function chatModel(id?: string) {
  const resolved = !id || id.startsWith("claude") ? DEFAULT_MODEL : id;
  return ollama(resolved);
}
