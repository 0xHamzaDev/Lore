import { z } from "zod";
import { generateModelObject, MODELS } from "@lore/ai";
import { agentFindingSchema, type AgentFindingOutput, type CompactEntity } from "@lore/validators";
import { webSearch } from "../web-search";

// Verification's intermediate schema: the model emits a {query, finding}
// candidate per real-world claim it considers worth checking. We then run
// each query through webSearch() and retain only candidates with non-empty
// results. With the Phase 10 stub returning [], `out.findings` is ~always
// empty — that's the intended behavior until a real provider lands.
const verificationCandidatesSchema = z.object({
  candidates: z
    .array(
      z.object({
        query: z.string().min(1).max(200),
        finding: agentFindingSchema,
      }),
    )
    .max(50),
});

export interface VerificationInput {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
  model?: string;
}

export interface VerificationResult {
  findings: AgentFindingOutput[];
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  model: string;
}

export function buildVerificationPrompt(input: {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}): { system: string; prompt: string } {
  const system = [
    "You are a fact-verification agent for a fictional world.",
    "Identify real-world claims in the entities that are worth fact-checking: real city names, historical events, technologies, scientific facts, geographical claims. Ignore obviously invented names, magic systems, and clearly fictional elements.",
    "",
    "For each claim, produce a `{ query, finding }` candidate:",
    "- `query`: a short web-search query a human would use to verify the claim.",
    "- `finding`: the finding to surface IF the query returns useful results. Severity rubric:",
    "  - error: the claim is verifiably false (you won't know this without searching — leave to the post-search step).",
    "  - warning: the claim is worth double-checking — most verification findings.",
    "  - info: a minor accuracy nudge.",
    "",
    "Anchor each finding to the entity that contains the claim.",
    "Return at most 50 candidates. If no real-world claims warrant checking, return candidates=[].",
  ].join("\n");

  const prompt = [
    `Project ${input.projectId}, branch ${input.branchId}.`,
    "Entities:",
    JSON.stringify(input.entities),
  ].join("\n");

  return { system, prompt };
}

export async function runVerificationAgent(input: VerificationInput): Promise<VerificationResult> {
  const model = input.model ?? MODELS.sonnet;
  const { system, prompt } = buildVerificationPrompt(input);

  const result = await generateModelObject({
    model,
    schema: verificationCandidatesSchema,
    system,
    prompt,
    maxTokens: 4000,
  });

  // Run each candidate's query through webSearch and keep only those backed
  // by at least one result. The stub returns [], so nearly always [].
  const findings: AgentFindingOutput[] = [];
  for (const c of result.object.candidates) {
    const results = await webSearch(c.query);
    if (results.length > 0) findings.push(c.finding);
  }

  return {
    findings,
    usage: result.usage,
    latencyMs: result.latencyMs,
    model,
  };
}
