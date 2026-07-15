import { MODELS, type StreamModelTextSSEResult, streamModelTextSSE } from "@lore/ai";

// Payload the web route forwards. orgId/projectId are injected server-side
// from the session — never trusted from the browser. `brief` is the user's
// one-line story prompt; `locale` selects the content language. Optional
// fields are typed `| undefined` (not just `?:`) so a zod-parsed request body
// can be spread straight into this shape under `exactOptionalPropertyTypes`.
export interface WizardPayload {
  orgId?: string | null | undefined;
  projectId?: string | null | undefined;
  brief?: string | undefined;
  locale?: string | undefined;
  model?: string | undefined;
}

const ENTITY_TARGETS =
  "4-6 characters, 2-3 locations, 0-2 factions, 2-4 scenes, 2-4 timeline_events";

export function buildWizardPrompt(payload: WizardPayload): {
  system: string;
  prompt: string;
} {
  const lang = payload.locale === "ar" ? "Arabic" : "English";
  const brief = (payload.brief ?? "").trim();

  const system = [
    "You are the Writer Agent for Lore, a collaborative story-writing canvas.",
    "Given a one-line story brief, invent a coherent starting cast of story entities.",
    `Write ALL entity content in ${lang}.`,
    "Output format: NDJSON — exactly one JSON object per line. No prose, no markdown, no code fences, no blank lines.",
    'Each line is one object: {"entityType":"<type>","data":{...}}.',
    "Valid entityType values and their data fields:",
    '- character: {"name","bio","age","role","backstory","voiceSample"}',
    '- location: {"name","description","climate","culture","history"}',
    '- faction: {"name","description","ideology","goals"}',
    '- scene: {"title","summary","beat","sceneOrder"}',
    '- timeline_event: {"title","description","date","significance"}',
    `Produce roughly: ${ENTITY_TARGETS}.`,
    "Make names and content specific and internally consistent with the brief. Avoid generic filler.",
  ].join("\n");

  const prompt =
    brief.length > 0
      ? `Story brief: ${brief}\n\nGenerate the entities now as NDJSON.`
      : "Generate a small, coherent starting cast now as NDJSON.";

  return { system, prompt };
}

export interface WizardStreamResult extends StreamModelTextSSEResult {
  model: string;
}

// Builds the prompt and kicks off the streaming model call. Returns the model id
// alongside the stream so the caller can log the ai_runs row without re-deriving.
export function runWizardStream(payload: WizardPayload): WizardStreamResult {
  const { system, prompt } = buildWizardPrompt(payload);
  const model = typeof payload.model === "string" ? payload.model : MODELS.sonnet;
  const { stream, done } = streamModelTextSSE({
    model,
    system,
    prompt,
    maxTokens: 4000,
    timeoutMs: 90_000,
  });
  return { stream, done, model };
}
