import { streamModelTextSSE, MODELS, type StreamModelTextSSEResult } from "@lore/ai";
import type { CompactEntity } from "@lore/validators";

// Payload the web route forwards (via the gateway) when the command router
// classifies an instruction as `query`. The answer streams back as SSE so the
// command bar can render it token-by-token. orgId is injected server-side from
// the session — never trusted from the browser.
export interface QueryPayload {
  orgId?: string | null;
  projectId?: string | null;
  question?: string;
  entities?: CompactEntity[];
  locale?: string;
  model?: string;
}

export function buildQueryPrompt(payload: QueryPayload): { system: string; prompt: string } {
  const lang = payload.locale === "ar" ? "Arabic" : "English";
  const question = (payload.question ?? "").trim();
  const entities = payload.entities ?? [];

  const system = [
    `You answer the user's question about a story in ${lang}.`,
    "Use only the entities provided in the user message.",
    "If the answer is not in the entities, say so plainly. Do not invent.",
    "Keep answers concise unless the user explicitly asks for detail.",
  ].join("\n");

  const prompt = [
    "Entities in this branch:",
    JSON.stringify(entities),
    "",
    "Question:",
    question.length > 0 ? question : "(empty)",
  ].join("\n");

  return { system, prompt };
}

export interface QueryStreamResult extends StreamModelTextSSEResult {
  model: string;
}

// Builds the Q&A prompt and kicks off the streaming model call. The model id
// is returned alongside the stream so the caller can log the ai_runs row
// without re-deriving it.
export function runQueryStream(payload: QueryPayload): QueryStreamResult {
  const { system, prompt } = buildQueryPrompt(payload);
  const model = typeof payload.model === "string" ? payload.model : MODELS.sonnet;
  const { stream, done } = streamModelTextSSE({
    model,
    system,
    prompt,
    maxTokens: 1500,
    timeoutMs: 60_000,
  });
  return { stream, done, model };
}
