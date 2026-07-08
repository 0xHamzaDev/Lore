import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ZodSchema } from "zod";

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
    model: anthropic(opts.model),
    schema: opts.schema,
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
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
    },
    latencyMs: Date.now() - start,
    model: opts.model,
  };
}
