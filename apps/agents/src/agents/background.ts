import { buildAgentContext } from "./context";
import { runContinuityAgent } from "./continuity";
import { runPacingAgent } from "./pacing";
import { runDialogueAgent } from "./dialogue";
import { runVerificationAgent } from "./verification";
import { upsertFindings } from "./upsert";
import { logAiRun } from "../logger";
import { MODELS } from "@lore/ai";

export interface BackgroundInput {
  orgId: string;
  projectId: string;
  branchId: string;
}

export type BackgroundAgent = "continuity" | "pacing" | "dialogue" | "verification";

export interface AgentRunSummary {
  agent: BackgroundAgent;
  status: "success" | "error";
  findings: number;
  latencyMs: number;
  error?: string;
}

export interface BackgroundResult {
  startedAt: number;
  completedAt: number;
  results: AgentRunSummary[];
}

interface SingleAgentResult {
  findings: Array<{
    entityId: string | null;
    entityType: "character" | "location" | "faction" | "scene" | "timeline_event" | null;
    severity: "error" | "warning" | "info";
    message: string;
  }>;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

// Wraps one agent: log a row + upsert findings on success; log an error row
// on failure. Never throws — returns a per-agent summary the orchestrator
// folds into the BackgroundResult.
async function runOne(args: {
  agent: BackgroundAgent;
  orgId: string;
  projectId: string;
  branchId: string;
  call: () => Promise<SingleAgentResult>;
}): Promise<AgentRunSummary> {
  const start = Date.now();
  try {
    const result = await args.call();
    const aiRunId = await logAiRun({
      orgId: args.orgId,
      projectId: args.projectId,
      runType: "agent",
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.latencyMs,
      status: "success",
    });
    await upsertFindings({
      orgId: args.orgId,
      projectId: args.projectId,
      branchId: args.branchId,
      agentType: args.agent,
      aiRunId,
      payload: result.findings,
    });
    return {
      agent: args.agent,
      status: "success",
      findings: result.findings.length,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      orgId: args.orgId,
      projectId: args.projectId,
      runType: "agent",
      model: MODELS.sonnet,
      latencyMs: Date.now() - start,
      status: "error",
      errorMessage: `${args.agent}: ${message}`,
    });
    return {
      agent: args.agent,
      status: "error",
      findings: 0,
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}

export async function runBackgroundAgents(input: BackgroundInput): Promise<BackgroundResult> {
  const startedAt = Date.now();
  const ctx = await buildAgentContext({
    orgId: input.orgId,
    projectId: input.projectId,
    branchId: input.branchId,
  });

  const results = await Promise.all([
    runOne({
      agent: "continuity",
      orgId: input.orgId,
      projectId: input.projectId,
      branchId: input.branchId,
      call: () => runContinuityAgent(ctx),
    }),
    runOne({
      agent: "pacing",
      orgId: input.orgId,
      projectId: input.projectId,
      branchId: input.branchId,
      call: () => runPacingAgent(ctx),
    }),
    runOne({
      agent: "dialogue",
      orgId: input.orgId,
      projectId: input.projectId,
      branchId: input.branchId,
      call: () => runDialogueAgent(ctx),
    }),
    runOne({
      agent: "verification",
      orgId: input.orgId,
      projectId: input.projectId,
      branchId: input.branchId,
      call: () => runVerificationAgent(ctx),
    }),
  ]);

  return { startedAt, completedAt: Date.now(), results };
}
