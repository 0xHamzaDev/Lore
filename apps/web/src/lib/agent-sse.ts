import { type FieldStreamResult, logAiRun, type WizardStreamResult } from "@lore/agents";
import { createNdjsonParser } from "@lore/ai";
import type { AiRunType } from "@lore/db";
import { wizardEntitySchema } from "@lore/validators";

// Web-Response counterpart to apps/agents/src/index.ts's node:http SSE
// handlers. The AI routes now call the agent run functions in-process (no
// gateway hop), so this module owns the SSE framing + ai_runs logging that
// index.ts used to do over a raw ServerResponse. The wire format (event
// names, frame payload keys) is copied verbatim — the browser client depends
// on it and must not need to change.

export const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
} as const;

// Serialize one Server-Sent Event frame. Mirrors apps/agents/src/index.ts's
// sseFrame exactly.
function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface DeltaStreamMeta {
  orgId: string | null;
  projectId: string | null;
  runType: AiRunType;
  // generate-field's terminal `done` frame includes the logged ai_runs row id
  // (so the browser's Accept flow can flag the run later) and logs with
  // `accepted: false`; query's does neither. Mirrors handleAgentStream vs
  // handleQueryStream in apps/agents/src/index.ts.
  includeAiRunId: boolean;
}

// SSE Response for the delta-style streams (generate-field, query): `delta`
// frames while streaming, then a terminal `done` frame carrying usage/model
// (or an `error` frame). Logs a single ai_runs row once the stream finishes,
// success or error. Mirrors handleAgentStream / handleQueryStream.
export function createDeltaSseResponse(result: FieldStreamResult, meta: DeltaStreamMeta): Response {
  const { stream, done, model } = result;
  const { orgId, projectId, runType, includeAiRunId } = meta;
  const start = Date.now();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Pump model text deltas to the client as they arrive.
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          const text = decoder.decode(value);
          if (text) controller.enqueue(encoder.encode(sseFrame("delta", { text })));
        }
      } catch {
        // A read error means the `done` promise below rejects too — handle it there.
      }

      try {
        const finished = await done;
        const aiRunId = await logAiRun({
          orgId,
          projectId,
          runType,
          model,
          inputTokens: finished.usage.inputTokens,
          outputTokens: finished.usage.outputTokens,
          latencyMs: finished.latencyMs,
          status: "success",
          ...(includeAiRunId ? { accepted: false } : {}),
        });
        const donePayload = includeAiRunId
          ? { aiRunId, usage: finished.usage, latencyMs: finished.latencyMs, model }
          : { usage: finished.usage, latencyMs: finished.latencyMs, model };
        controller.enqueue(encoder.encode(sseFrame("done", donePayload)));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logAiRun({
          orgId,
          projectId,
          runType,
          model,
          latencyMs: Date.now() - start,
          status: "error",
          errorMessage: message,
          ...(includeAiRunId ? { accepted: false } : {}),
        });
        controller.enqueue(encoder.encode(sseFrame("error", { message })));
      }
      controller.close();
    },
  });

  return new Response(body, { status: 200, headers: SSE_HEADERS });
}

interface WizardStreamMeta {
  orgId: string | null;
  projectId: string | null;
}

// SSE Response for the wizard stream: parses the model's NDJSON output
// line-by-line, validates each entity, and emits one `entity_created` frame
// per valid entity. Logs a single ai_runs row (run_type='wizard') at stream
// end and emits `wizard_complete` (or `error`). Never writes entity rows —
// the browser persists them. Mirrors handleWizardStream.
export function createWizardSseResponse(
  result: WizardStreamResult,
  meta: WizardStreamMeta,
): Response {
  const { stream, done, model } = result;
  const { orgId, projectId } = meta;
  const start = Date.now();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const parser = createNdjsonParser();
      let count = 0;

      const emit = (objs: unknown[]) => {
        for (const obj of objs) {
          const parsed = wizardEntitySchema.safeParse(obj);
          if (!parsed.success) continue; // skip a malformed/unknown entity
          count += 1;
          controller.enqueue(encoder.encode(sseFrame("entity_created", parsed.data)));
        }
      };

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          const text = decoder.decode(value, { stream: true });
          if (text) emit(parser.push(text));
        }
        emit(parser.flush());
      } catch {
        // A read error means the `done` promise below rejects too — handle it there.
      }

      try {
        const finished = await done;
        await logAiRun({
          orgId,
          projectId,
          runType: "wizard",
          model,
          inputTokens: finished.usage.inputTokens,
          outputTokens: finished.usage.outputTokens,
          latencyMs: finished.latencyMs,
          status: "success",
        });
        controller.enqueue(
          encoder.encode(
            sseFrame("wizard_complete", {
              count,
              usage: finished.usage,
              latencyMs: finished.latencyMs,
              model,
            }),
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logAiRun({
          orgId,
          projectId,
          runType: "wizard",
          model,
          latencyMs: Date.now() - start,
          status: "error",
          errorMessage: message,
        });
        controller.enqueue(encoder.encode(sseFrame("error", { message })));
      }
      controller.close();
    },
  });

  return new Response(body, { status: 200, headers: SSE_HEADERS });
}

// A single SSE `error` frame, used when the request fails validation before
// any model call starts (mirrors the routes' pre-existing early-error shape).
export function sseErrorResponse(message: string): Response {
  const encoder = new TextEncoder();
  return new Response(encoder.encode(sseFrame("error", { message })), {
    status: 200,
    headers: SSE_HEADERS,
  });
}
