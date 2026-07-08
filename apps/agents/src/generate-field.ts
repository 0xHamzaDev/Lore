import {
  streamModelTextSSE,
  MODELS,
  type StreamModelTextSSEResult,
} from "@lore/ai";

// Payload the web route forwards (via the gateway) for an on-demand field
// generation. orgId is injected server-side from the session — never trusted
// from the browser. `context` is the entity's current sibling-field values so
// the model can stay consistent (e.g. a backstory that matches the bio).
export interface GenerateFieldPayload {
  orgId?: string | null;
  projectId?: string | null;
  entityType?: string;
  fieldKey?: string;
  fieldLabel?: string;
  context?: Record<string, string>;
  locale?: string;
  model?: string;
}

const ENTITY_NOUN: Record<string, string> = {
  character: "character",
  location: "location",
  faction: "faction",
  scene: "scene",
  timeline_event: "timeline event",
};

// Per-field guidance for the text-rich fields that expose a wand button. Keep
// these short — they steer length/shape; the system prompt enforces format.
const FIELD_GUIDANCE: Record<string, string> = {
  bio: "Write a concise biography (2-4 sentences) covering personality, role, and current situation.",
  backstory:
    "Write an evocative backstory (one short paragraph) explaining formative events and motivations.",
  voiceSample:
    "Write a short sample of dialogue (1-3 lines) that captures how this character speaks.",
  description: "Write a vivid, concrete description (2-4 sentences).",
  history:
    "Write a brief history (one short paragraph) of notable past events.",
  goals: "Describe the primary goals and motivations (2-4 sentences).",
  summary: "Write a concise summary (2-4 sentences) of what happens.",
};

export function buildFieldPrompt(payload: GenerateFieldPayload): {
  system: string;
  prompt: string;
} {
  const lang = payload.locale === "ar" ? "Arabic" : "English";
  const noun = ENTITY_NOUN[payload.entityType ?? ""] ?? "story entity";
  const fieldLabel = payload.fieldLabel || payload.fieldKey || "field";
  const guidance =
    FIELD_GUIDANCE[payload.fieldKey ?? ""] ??
    `Write appropriate content for the "${fieldLabel}".`;

  const system = [
    "You are a worldbuilding assistant for Lore, a collaborative story-writing canvas.",
    `Write your entire response in ${lang}.`,
    "Output ONLY the content for the requested field — no preamble, no field label, no markdown headings, no wrapping quotation marks.",
    "Stay consistent with the context provided. Be specific and usable; avoid generic filler.",
  ].join(" ");

  // Ground the model in the entity's other filled-in fields (skip the target
  // field and any empties).
  const ctx = payload.context ?? {};
  const lines: string[] = [];
  for (const [key, value] of Object.entries(ctx)) {
    if (key === payload.fieldKey) continue;
    if (typeof value === "string" && value.trim().length > 0) {
      lines.push(`- ${key}: ${value.trim()}`);
    }
  }
  const contextBlock =
    lines.length > 0
      ? `\n\nKnown details about this ${noun}:\n${lines.join("\n")}`
      : "";

  const prompt = `Generate the "${fieldLabel}" field for a ${noun}. ${guidance}${contextBlock}`;

  return { system, prompt };
}

export interface FieldStreamResult extends StreamModelTextSSEResult {
  model: string;
}

// Builds the prompt and kicks off the streaming model call. The model id is
// returned alongside the stream so the caller can log the ai_runs row without
// re-deriving it.
export function runGenerateFieldStream(
  payload: GenerateFieldPayload,
): FieldStreamResult {
  const { system, prompt } = buildFieldPrompt(payload);
  const model =
    typeof payload.model === "string" ? payload.model : MODELS.sonnet;
  const { stream, done } = streamModelTextSSE({
    model,
    system,
    prompt,
    maxTokens: 600,
    timeoutMs: 45_000,
  });
  return { stream, done, model };
}
