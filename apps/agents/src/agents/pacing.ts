import { generateModelObject, MODELS } from "@lore/ai";
import {
  agentFindingsPayloadSchema,
  type AgentFindingOutput,
  type CompactEntity,
} from "@lore/validators";

export interface PacingInput {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
  model?: string;
}

export interface PacingResult {
  findings: AgentFindingOutput[];
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

// Builds the system + prompt for the pacing agent. System pins the rubric
// (error / warning / info) and the agent's scope; prompt carries the entity
// list verbatim as JSON so the model can reason about scene and timeline density.
export function buildPacingPrompt(input: {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}): { system: string; prompt: string } {
  const system = [
    "You are a pacing-analysis agent for a fictional story.",
    "Inspect the scenes and timeline events for density imbalances, missing connective scenes, and timeline gaps that would feel jarring to a reader.",
    "",
    "Severity rubric:",
    "- error: a structural problem that breaks reader comprehension (very rare for pacing).",
    "- warning: a likely pacing issue worth review — may be a deliberate choice.",
    "- info: a stylistic suggestion (most pacing findings will be this).",
    "",
    "Most pacing findings are project-wide. When the issue is about the story as a whole (act-2 thin, abrupt transition between scenes), set entityId=null and entityType=null. When you can anchor to a single scene or timeline event, do.",
    "Return at most 50 findings. If pacing reads well, return findings=[].",
  ].join("\n");

  const prompt = [
    `Project ${input.projectId}, branch ${input.branchId}.`,
    "Entities:",
    JSON.stringify(input.entities),
  ].join("\n");

  return { system, prompt };
}

export async function runPacingAgent(input: PacingInput): Promise<PacingResult> {
  const model = input.model ?? MODELS.sonnet;
  const { system, prompt } = buildPacingPrompt(input);

  const result = await generateModelObject({
    model,
    schema: agentFindingsPayloadSchema,
    system,
    prompt,
    maxTokens: 4000,
  });

  return {
    findings: result.object.findings,
    usage: result.usage,
    latencyMs: result.latencyMs,
    model,
  };
}
