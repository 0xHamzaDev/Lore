import { z } from "zod";
import { entityTypeSchema } from "./command";

// Single agent finding. `entityId`/`entityType` are null when the finding
// applies to the project as a whole (e.g. pacing complaining about act-2
// density). The model decides severity per finding — see the rubric in each
// agent's system prompt.
export const agentFindingSchema = z.object({
  entityId: z.string().nullable(),
  entityType: entityTypeSchema.nullable(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().min(8).max(400),
});

// Hard 50-finding cap is defensive — without it a chatty model can produce
// thousands of low-value rows in a single response.
export const agentFindingsPayloadSchema = z.object({
  findings: z.array(agentFindingSchema).max(50),
});

export type AgentFindingOutput = z.infer<typeof agentFindingSchema>;
export type AgentFindingsPayload = z.infer<typeof agentFindingsPayloadSchema>;
