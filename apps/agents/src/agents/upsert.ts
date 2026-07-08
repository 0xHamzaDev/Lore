import { db, agentFindings, and, eq, type NewAgentFinding } from "@lore/db";
import type { AgentFindingOutput } from "@lore/validators";

export interface UpsertInput {
  orgId: string;
  projectId: string;
  branchId: string;
  agentType: "continuity" | "pacing" | "dialogue" | "verification";
  aiRunId: string | null;
  payload: AgentFindingOutput[];
}

// Three-way reconciliation between the model's new payload and existing rows
// for (projectId, branchId, agentType). Dedup is enforced application-side
// here (the DB has no unique index covering message text + nullable entityId).
//
//   - new finding NOT in existing               → INSERT (status='open')
//   - new finding matches existing open         → no-op
//   - new finding matches existing resolved     → UPDATE status='open', clear resolvedAt
//   - new finding matches existing dismissed    → no-op  (dismissed is sticky)
//   - existing open NOT in new payload          → UPDATE status='resolved', set resolvedAt
//   - existing resolved/dismissed NOT in new    → no-op  (already terminal)
//
// Scope is strictly (projectId, branchId, agentType) — continuity's sweep
// cannot touch pacing's rows.
//
// No transaction (neon-http throws). Sequential writes; a partial failure may
// leave a few rows un-swept until the next run.
export async function upsertFindings(input: UpsertInput): Promise<void> {
  const existing = await db
    .select()
    .from(agentFindings)
    .where(
      and(
        eq(agentFindings.projectId, input.projectId),
        eq(agentFindings.branchId, input.branchId),
        eq(agentFindings.agentType, input.agentType),
      ),
    );

  const keyOf = (entityId: string | null, message: string) =>
    `${entityId ?? ""}::${message}`;

  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const row of existing)
    existingByKey.set(keyOf(row.entityId, row.message), row);

  const inserts: NewAgentFinding[] = [];
  const reopens: string[] = [];
  const matchedKeys = new Set<string>();

  for (const f of input.payload) {
    const k = keyOf(f.entityId, f.message);
    const existingRow = existingByKey.get(k);
    if (!existingRow) {
      inserts.push({
        orgId: input.orgId,
        projectId: input.projectId,
        branchId: input.branchId,
        agentType: input.agentType,
        entityId: f.entityId,
        entityType: f.entityType,
        severity: f.severity,
        message: f.message,
        status: "open",
        aiRunId: input.aiRunId,
      });
      continue;
    }
    matchedKeys.add(k);
    if (existingRow.status === "resolved") reopens.push(existingRow.id);
  }

  const sweeps: string[] = [];
  for (const row of existing) {
    // Defensive: the WHERE clause already constrains agentType, but reasserting
    // it here keeps the sweep correct even if a future caller widens the query.
    if (row.agentType !== input.agentType) continue;
    if (row.status !== "open") continue;
    if (matchedKeys.has(keyOf(row.entityId, row.message))) continue;
    sweeps.push(row.id);
  }

  if (inserts.length > 0) {
    await db.insert(agentFindings).values(inserts);
  }
  for (const id of reopens) {
    await db
      .update(agentFindings)
      .set({
        status: "open",
        resolvedAt: null,
        updatedAt: new Date(),
        aiRunId: input.aiRunId,
      })
      .where(eq(agentFindings.id, id));
  }
  for (const id of sweeps) {
    await db
      .update(agentFindings)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentFindings.id, id));
  }
}
