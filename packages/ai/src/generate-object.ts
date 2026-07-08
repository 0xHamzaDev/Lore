import { generateObject } from "ai";
import { chatModel, toTokenCount } from "./provider";
import type { ZodSchema } from "zod";

/**
 * Repair loosely-formatted model JSON so the SDK's strict parser accepts it.
 * Ollama models frequently return the object wrapped in a ```json fence and/or
 * with leading prose. We unwrap a fenced block if present, then slice to the
 * outermost {...} / [...] span. Returns the repaired string, or null to let the
 * SDK surface its original parse error when nothing JSON-shaped is found.
 */
async function repairModelJson({ text }: { text: string }): Promise<string | null> {
  let t = text.trim();

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();

  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  const candidates = [firstObj, firstArr].filter((i) => i >= 0);
  if (candidates.length === 0) return null;
  const start = Math.min(...candidates);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end <= start) return null;

  return t.slice(start, end + 1);
}

export interface GenerateModelObjectOptions<T> {
  model: string;
  schema: ZodSchema<T>;
  system?: string;
  prompt?: string;
  maxTokens?: number;
  /** Hard wall-clock cap. The request aborts and throws if exceeded. */
  timeoutMs?: number;
  schemaName?: string;
}

export interface GenerateModelObjectResult<T> {
  object: T;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

/**
 * Thin wrapper over Vercel AI SDK's `generateObject`. The model is forced to
 * emit JSON matching `schema`; for a discriminated union the model's chosen
 * variant IS the classification. Reshapes usage to {inputTokens, outputTokens}
 * to match the agents-server logger's expected shape.
 */
export async function generateModelObject<T>(
  opts: GenerateModelObjectOptions<T>,
): Promise<GenerateModelObjectResult<T>> {
  const start = Date.now();

  // Build params without explicit `undefined` keys — AI SDK's option types
  // reject `undefined` under exactOptionalPropertyTypes. We cast through
  // Record<string, unknown> because `Parameters<typeof generateObject>[0]`
  // collapses to the last (no-schema) overload, hiding the schema field.
  const params: Record<string, unknown> = {
    model: chatModel(opts.model),
    schema: opts.schema,
    // Force JSON mode rather than tool-calling: Ollama's OpenAI-compatible
    // endpoint reliably supports `response_format: json_object`, whereas
    // function-call structured output varies by model. The SDK injects the
    // schema into the prompt in this mode.
    mode: "json",
    // Ollama models don't fully honor `response_format` — they commonly wrap
    // the JSON in ```json markdown fences or add prose, which the SDK's strict
    // parser rejects ("could not parse the response"). Repair the raw text by
    // unwrapping fences and slicing to the outermost JSON value before parsing.
    experimental_repairText: repairModelJson,
    maxTokens: opts.maxTokens ?? 1024,
    abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  };
  if (opts.system !== undefined) params.system = opts.system;
  if (opts.prompt !== undefined) params.prompt = opts.prompt;
  if (opts.schemaName !== undefined) params.schemaName = opts.schemaName;

  const result = await generateObject(
    params as Parameters<typeof generateObject>[0],
  );

  return {
    object: result.object as T,
    usage: {
      inputTokens: toTokenCount(result.usage?.promptTokens),
      outputTokens: toTokenCount(result.usage?.completionTokens),
    },
    latencyMs: Date.now() - start,
    model: opts.model,
  };
}
