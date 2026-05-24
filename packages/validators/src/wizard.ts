import { z } from "zod";

// Shared wizard entity schemas. Used in two places (DRY):
//  1. agents server — validates each parsed NDJSON line before emitting it
//  2. web createWizardEntity action — re-validates the untrusted browser payload
// Unknown keys are stripped (zod default), not rejected, so an extra field from
// the model never discards an otherwise-good entity. Length bounds are generous;
// an entity that blows past them is dropped as abnormal/abusive.

const name = z.string().trim().min(1).max(200);
const title = z.string().trim().min(1).max(200);
const short = z.string().trim().max(200).optional();
const medium = z.string().trim().max(3000).optional();
const long = z.string().trim().max(6000).optional();

export const wizardCharacterData = z.object({
  name,
  bio: medium,
  age: short,
  role: short,
  backstory: long,
  voiceSample: medium,
});

export const wizardLocationData = z.object({
  name,
  description: medium,
  climate: short,
  culture: medium,
  history: long,
});

export const wizardFactionData = z.object({
  name,
  description: medium,
  ideology: medium,
  goals: medium,
});

export const wizardSceneData = z.object({
  title,
  summary: medium,
  beat: short,
  sceneOrder: z.coerce.number().int().min(0).max(100000).optional(),
});

export const wizardTimelineEventData = z.object({
  title,
  description: medium,
  date: short,
  significance: medium,
});

export const wizardEntitySchema = z.discriminatedUnion("entityType", [
  z.object({ entityType: z.literal("character"), data: wizardCharacterData }),
  z.object({ entityType: z.literal("location"), data: wizardLocationData }),
  z.object({ entityType: z.literal("faction"), data: wizardFactionData }),
  z.object({ entityType: z.literal("scene"), data: wizardSceneData }),
  z.object({ entityType: z.literal("timeline_event"), data: wizardTimelineEventData }),
]);

export type WizardEntity = z.infer<typeof wizardEntitySchema>;
export type WizardEntityType = WizardEntity["entityType"];
