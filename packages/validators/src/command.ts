import { z } from "zod";
import { wizardEntitySchema } from "./wizard";

export const ENTITY_TYPES = [
  "character",
  "location",
  "faction",
  "scene",
  "timeline_event",
] as const;
export const entityTypeSchema = z.enum(ENTITY_TYPES);
export type EntityTypeName = z.infer<typeof entityTypeSchema>;

// Compact entity projection sent to the model. The router uses these to
// resolve `entityId`s for edits and to ground query answers. Kept small so
// large branches still fit in one prompt.
export const compactEntitySchema = z.object({
  id: z.string().min(1).max(50),
  type: entityTypeSchema,
  name: z.string().min(1).max(200),
  hint: z.string().max(300).optional(),
});
export type CompactEntity = z.infer<typeof compactEntitySchema>;

const createIntent = z.object({
  intent: z.literal("create"),
  entities: z.array(wizardEntitySchema).min(1).max(10),
});

const patchOp = z.object({
  op: z.literal("patch"),
  entityId: z.string().min(1).max(50),
  entityType: entityTypeSchema,
  field: z.string().min(1).max(64),
  suggestedValue: z.string().max(6000),
});

const deleteOp = z.object({
  op: z.literal("delete"),
  entityId: z.string().min(1).max(50),
  entityType: entityTypeSchema,
  name: z.string().min(1).max(200),
});

const editIntent = z.object({
  intent: z.literal("edit"),
  destructive: z.boolean(),
  summary: z.string().min(1).max(400),
  operations: z
    .array(z.discriminatedUnion("op", [patchOp, deleteOp]))
    .min(1)
    .max(20),
});

const queryIntent = z.object({ intent: z.literal("query") });

const agentTriggerIntent = z.object({
  intent: z.literal("agent_trigger"),
  scope: z.string().min(1).max(200),
  message: z.string().min(1).max(400),
});

const unknownIntent = z.object({
  intent: z.literal("unknown"),
  message: z.string().min(1).max(400),
});

// Discriminated union on `intent`. The model's chosen variant IS the
// classification; the variant fields ARE the structured result. Used both
// as the agents-server `generateObject` schema and the Next route's
// response shape.
export const commandIntentSchema = z.discriminatedUnion("intent", [
  createIntent,
  editIntent,
  queryIntent,
  agentTriggerIntent,
  unknownIntent,
]);

export type CommandIntent = z.infer<typeof commandIntentSchema>;
export type CommandCreateIntent = z.infer<typeof createIntent>;
export type CommandEditIntent = z.infer<typeof editIntent>;
export type CommandEditPatchOp = z.infer<typeof patchOp>;
export type CommandEditDeleteOp = z.infer<typeof deleteOp>;
export type CommandQueryIntent = z.infer<typeof queryIntent>;
export type CommandAgentTriggerIntent = z.infer<typeof agentTriggerIntent>;
export type CommandUnknownIntent = z.infer<typeof unknownIntent>;
