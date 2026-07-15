import { type GenerateModelObjectResult, generateModelObject, MODELS } from "@lore/ai";
import { type CommandIntent, type CompactEntity, commandIntentSchema } from "@lore/validators";

// Optional fields are typed `| undefined` (not just `?:`) so a zod-parsed
// request body can be spread straight into this shape under
// `exactOptionalPropertyTypes`.
export interface CommandRouterPayload {
  orgId?: string | null | undefined;
  projectId?: string | null | undefined;
  instruction?: string | undefined;
  entities?: CompactEntity[] | undefined;
  locale?: string | undefined;
  model?: string | undefined;
}

export function buildCommandRouterPrompt(payload: CommandRouterPayload): {
  system: string;
  prompt: string;
} {
  const lang = payload.locale === "ar" ? "Arabic" : "English";
  const instruction = (payload.instruction ?? "").trim();
  const entities = payload.entities ?? [];

  const system = [
    "You are the Command Processor for Lore, a collaborative story-writing canvas.",
    "Classify the user's instruction into exactly one of: create, edit, query, agent_trigger, unknown.",
    "Output a single JSON object matching the provided schema.",
    "",
    "Choose `unknown` if the instruction is unrelated to story authoring or ambiguous between intents.",
    "",
    `For \`create\`: invent rich, coherent entity content using the wizard field set. Write all content in ${lang}. Names must be specific.`,
    "",
    'For `edit`: use `op:"patch"` for single-field text updates. Use `op:"delete"` only for unambiguous multi-entity removals ("delete all scenes", "remove every faction"). Set `destructive:true` iff any `delete` op is present OR a patch affects more than one entity.',
    "",
    "For `query`: set intent to `query` only — the answer streams from a separate call.",
    "",
    'For `agent_trigger`: use this only when the user asks to run a check across the story ("check continuity", "verify dates"). Fill `scope` with the parsed target.',
    "",
    "Resolution rule: pick `entityId` values ONLY from the entity list in the user message. Never invent ids.",
  ].join("\n");

  const prompt = [
    "Entities in this branch:",
    JSON.stringify(entities),
    "",
    "User instruction:",
    instruction.length > 0 ? instruction : "(empty)",
  ].join("\n");

  return { system, prompt };
}

export type CommandRouterResult = GenerateModelObjectResult<CommandIntent>;

// One generateObject call that classifies AND produces the structured result.
// The agents-server caller logs a single ai_runs row with run_type='command'.
export async function runCommandRouter(
  payload: CommandRouterPayload,
): Promise<CommandRouterResult> {
  const { system, prompt } = buildCommandRouterPrompt(payload);
  const model = typeof payload.model === "string" ? payload.model : MODELS.sonnet;
  return await generateModelObject<CommandIntent>({
    model,
    schema: commandIntentSchema,
    system,
    prompt,
    maxTokens: 4000,
    timeoutMs: 90_000,
    schemaName: "CommandIntent",
  });
}
