import { streamModelText, MODELS } from "@lore/ai";
import type { AiRunType } from "@lore/db";
import { logAiRun } from "./logger";

export type AgentType =
  | "ping"
  | "wizard"
  | "command"
  | "query"
  | "generate-field"
  | "continuity"
  | "pacing"
  | "dialogue"
  | "verification";

export interface AgentRunInput {
  type: AgentType;
  payload?: {
    orgId?: string | null;
    projectId?: string | null;
    model?: string;
    [key: string]: unknown;
  };
}

// Which ai_runs.run_type each agent maps to. Phases 7–9 add the real prompts
// behind the stub handlers; the run_type taxonomy is fixed here.
const RUN_TYPE_BY_AGENT: Record<AgentType, AiRunType> = {
  ping: "on_demand",
  "generate-field": "on_demand",
  wizard: "wizard",
  command: "command",
  query: "query",
  continuity: "agent",
  pacing: "agent",
  dialogue: "agent",
  verification: "agent",
};

export async function runAgent(input: AgentRunInput): Promise<unknown> {
  switch (input.type) {
    case "ping":
      return runPing(input.payload ?? {});
    default:
      // Stub handlers — prompts land in Phases 7–9. No model call, so no
      // ai_runs row yet.
      return {
        ok: true,
        stub: true,
        type: input.type,
        runType: RUN_TYPE_BY_AGENT[input.type],
        note: "Handler is a Phase 6 stub; implemented in a later phase.",
      };
  }
}

// Liveness probe that exercises the full chain through to Anthropic. Uses Haiku
// — this is a cheap health check, not user-facing generation. The model is
// overridable via payload so the QA "forced error" path can pass a bad model id.
async function runPing(payload: NonNullable<AgentRunInput["payload"]>): Promise<unknown> {
  const model = typeof payload.model === "string" ? payload.model : MODELS.haiku;
  const orgId = payload.orgId ?? null;
  const projectId = payload.projectId ?? null;
  const start = Date.now();

  try {
    const result = await streamModelText({
      model,
      system: "You are a liveness probe.",
      prompt: "Reply with the single word: pong",
      maxTokens: 16,
    });
    await logAiRun({
      orgId,
      projectId,
      runType: "on_demand",
      model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
      status: "success",
    });
    return { ok: true, text: result.text, usage: result.usage, latencyMs: result.latencyMs, model };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      orgId,
      projectId,
      runType: "on_demand",
      model,
      latencyMs: Date.now() - start,
      status: "error",
      errorMessage: message,
    });
    throw err;
  }
}
