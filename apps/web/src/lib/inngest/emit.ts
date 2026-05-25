import { inngest } from "@/inngest/client";
import type { EntityType } from "@lore/db";

export interface EntityUpdatedArgs {
  orgId: string;
  projectId: string;
  branchId: string;
  entityId: string;
  entityType: EntityType;
}

// Fire-and-forget — never throws. An Inngest send failure must not break the
// user's mutation; the worst case is one missed debounce cycle.
export async function emitEntityUpdated(args: EntityUpdatedArgs): Promise<void> {
  try {
    await inngest.send({ name: "entity.updated", data: args });
  } catch (err) {
    console.error("[inngest] entity.updated emit failed", err);
  }
}
