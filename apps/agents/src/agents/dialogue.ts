import { generateModelObject, MODELS } from "@lore/ai";
import {
  agentFindingsPayloadSchema,
  type AgentFindingOutput,
  type CompactEntity,
} from "@lore/validators";

export interface DialogueInput {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
  model?: string;
}

export interface DialogueResult {
  findings: AgentFindingOutput[];
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

// Builds the system + prompt for the dialogue agent. System pins the rubric
// (error / warning / info) and the agent's scope; prompt carries the entity
// list verbatim as JSON so the model can compare each character's voiceSample
// against scene summaries that imply dialogue.
export function buildDialoguePrompt(input: {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}): { system: string; prompt: string } {
  const system = [
    "You are a dialogue/voice-consistency agent for a fictional story.",
    "For each character, the `voiceSample` field is the canonical voice. Inspect scene summaries and any other context for moments where a character's dialogue tone or vocabulary drifts from their voice sample.",
    "",
    "Severity rubric:",
    "- error: a character speaks in a way that contradicts an explicit personality fact (very rare for dialogue).",
    "- warning: a likely voice inconsistency worth review.",
    "- info: a stylistic suggestion that might tighten the voice.",
    "",
    "Anchor each finding to the affected character (entityId=character id, entityType='character'). If the scene context is what makes the drift obvious, mention the scene by name in the message.",
    "Return at most 50 findings. If voices read consistently, return findings=[].",
  ].join("\n");

  const prompt = [
    `Project ${input.projectId}, branch ${input.branchId}.`,
    "Entities:",
    JSON.stringify(input.entities),
  ].join("\n");

  return { system, prompt };
}

export async function runDialogueAgent(input: DialogueInput): Promise<DialogueResult> {
  const model = input.model ?? MODELS.sonnet;
  const { system, prompt } = buildDialoguePrompt(input);

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
