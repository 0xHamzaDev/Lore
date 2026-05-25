import { generateModelObject, MODELS } from "@lore/ai";
import {
  agentFindingsPayloadSchema,
  type AgentFindingOutput,
  type CompactEntity,
} from "@lore/validators";

export interface ContinuityInput {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
  model?: string;
}

export interface ContinuityResult {
  findings: AgentFindingOutput[];
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

// Builds the system + prompt for the continuity agent. System pins the rubric
// (error / warning / info) and the agent's scope; prompt carries the entity
// list verbatim as JSON so the model can cross-reference names and IDs.
export function buildContinuityPrompt(input: {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}): { system: string; prompt: string } {
  const system = [
    "You are a continuity-checking agent for a fictional world.",
    "Compare entities for factual contradictions: dates, ages, locations, faction memberships, cause-and-effect across scenes and timeline events.",
    "",
    "Severity rubric:",
    "- error: hard contradiction (e.g. character born 1850 but fought in an 1820 war). The author must address this before publishing.",
    "- warning: likely inconsistency worth review — may be intentional.",
    "- info: a minor stylistic suggestion. Take it or leave it.",
    "",
    "Anchor each finding to a single entity when possible (set entityId + entityType). If a contradiction spans two entities, anchor it to whichever is more concrete (a specific scene over a character). Project-wide observations (extremely rare for continuity) use entityId=null.",
    "Return at most 50 findings. If everything is consistent, return findings=[].",
  ].join("\n");

  const prompt = [
    `Project ${input.projectId}, branch ${input.branchId}.`,
    "Entities:",
    JSON.stringify(input.entities),
  ].join("\n");

  return { system, prompt };
}

export async function runContinuityAgent(input: ContinuityInput): Promise<ContinuityResult> {
  const model = input.model ?? MODELS.sonnet;
  const { system, prompt } = buildContinuityPrompt(input);

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
