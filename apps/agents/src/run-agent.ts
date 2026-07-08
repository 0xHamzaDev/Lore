import { streamModelText, MODELS } from "@lore/ai";
import type { AiRunType } from "@lore/db";
import { logAiRun } from "./logger";
import { runCommandRouter, type CommandRouterPayload } from "./command";

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
    case "command":
      return runCommand((input.payload ?? {}) as CommandRouterPayload);
    default:
      // Stub for types whose prompts haven't landed yet.
      return {
        ok: true,
        stub: true,
        type: input.type,
        runType: RUN_TYPE_BY_AGENT[input.type],
        note: "Handler is a Phase 6 stub; implemented in a later phase.",
      };
  }
}

async function runPing(
  payload: NonNullable<AgentRunInput["payload"]>,
): Promise<unknown> {
  const model =
    typeof payload.model === "string" ? payload.model : MODELS.haiku;
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
    return {
      ok: true,
      text: result.text,
      usage: result.usage,
      latencyMs: result.latencyMs,
      model,
    };
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

// Command router — one buffered model call that classifies + emits structured
// result. Logs exactly one ai_runs row with run_type='command' regardless of
// the chosen intent (including 'unknown').
async function runCommand(payload: CommandRouterPayload): Promise<unknown> {
  const orgId = payload.orgId ?? null;
  const projectId = payload.projectId ?? null;
  const start = Date.now();

  try {
    const result = await runCommandRouter(payload);
    await logAiRun({
      orgId,
      projectId,
      runType: "command",
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
      status: "success",
    });
    return result.object;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      orgId,
      projectId,
      runType: "command",
      model: typeof payload.model === "string" ? payload.model : MODELS.sonnet,
      latencyMs: Date.now() - start,
      status: "error",
      errorMessage: message,
    });
    throw err;
  }
}
