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

export interface StreamModelTextSSEResult {
  stream: ReadableStream<Uint8Array>;
  done: Promise<{
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
    text: string;
  }>;
}

/**
 * Streaming variant that exposes the raw byte stream. Phase 7+ uses this for
 * `/api/ai/generate-field` etc. — the buffered `streamModelText` is kept for
 * compact responses like `/api/ai/ping`.
 *
 * `done` resolves once the SDK emits a `finish` part. It rejects if any
 * `error` part is emitted (e.g. an SDK 400). The stream itself closes on
 * either path so consumers reading the stream see EOF either way.
 */
export function streamModelTextSSE(opts: StreamModelTextOptions): StreamModelTextSSEResult {
  const start = Date.now();
  const encoder = new TextEncoder();

  const params: Parameters<typeof streamText>[0] = {
    model: anthropic(opts.model),
    maxTokens: opts.maxTokens ?? 1024,
    abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  };
  if (opts.system !== undefined) params.system = opts.system;
  if (opts.prompt !== undefined) params.prompt = opts.prompt;
  if (opts.messages !== undefined) params.messages = opts.messages;

  const result = streamText(params);

  let resolveDone!: (v: {
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
    text: string;
  }) => void;
  let rejectDone!: (e: unknown) => void;
  const done = new Promise<{
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
    text: string;
  }>((res, rej) => {
    resolveDone = res;
    rejectDone = rej;
  });

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            text += part.textDelta;
            controller.enqueue(encoder.encode(part.textDelta));
          } else if (part.type === "finish") {
            inputTokens = part.usage.promptTokens ?? 0;
            outputTokens = part.usage.completionTokens ?? 0;
          } else if (part.type === "error") {
            const err = part.error;
            const e = err instanceof Error ? err : new Error(String(err));
            rejectDone(e);
            controller.close();
            return;
          }
        }
        controller.close();
        resolveDone({
          text,
          usage: { inputTokens, outputTokens },
          latencyMs: Date.now() - start,
        });
      } catch (err) {
        rejectDone(err);
        try {
          controller.close();
        } catch {
          // controller may already be closed
        }
      }
    },
  });

  return { stream, done };
}
