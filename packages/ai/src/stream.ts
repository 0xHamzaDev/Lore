import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Exact model IDs — never construct or date-suffix these.
export const MODELS = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5",
} as const;

export interface StreamModelTextOptions {
  model: string;
  system?: string;
  prompt?: string;
  messages?: CoreMessage[];
  maxTokens?: number;
  /** Hard wall-clock cap. The request aborts and throws if exceeded. */
  timeoutMs?: number;
}

export interface ModelTextResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

/**
 * Thin wrapper over the Vercel AI SDK + Anthropic. Streams the completion to
 * accumulate full text, and reports token usage plus wall-clock latency so the
 * caller (the agents server) can log a single ai_runs row per model call.
 * Reads ANTHROPIC_API_KEY from the environment via @ai-sdk/anthropic.
 */
export async function streamModelText(opts: StreamModelTextOptions): Promise<ModelTextResult> {
  const start = Date.now();

  // Build params without explicit `undefined` keys — the AI SDK's option types
  // reject `undefined` under exactOptionalPropertyTypes.
  const params: Parameters<typeof streamText>[0] = {
    model: anthropic(opts.model),
    maxTokens: opts.maxTokens ?? 1024,
    // AbortSignal.timeout guarantees the call can never hang indefinitely on a
    // stalled connection — it aborts and the stream surfaces the abort error.
    abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  };
  if (opts.system !== undefined) params.system = opts.system;
  if (opts.prompt !== undefined) params.prompt = opts.prompt;
  if (opts.messages !== undefined) params.messages = opts.messages;

  const result = streamText(params);

  // Iterate fullStream, not textStream: textStream silently ends on a request
  // error (e.g. a 400), which would otherwise leave the caller hanging on the
  // usage promise. The `error` part lets us fail fast with the real message.
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      text += part.textDelta;
    } else if (part.type === "error") {
      const err = part.error;
      throw err instanceof Error ? err : new Error(String(err));
    } else if (part.type === "finish") {
      inputTokens = part.usage.promptTokens ?? 0;
      outputTokens = part.usage.completionTokens ?? 0;
    }
  }

  return {
    text,
    usage: { inputTokens, outputTokens },
    latencyMs: Date.now() - start,
    model: opts.model,
  };
}
