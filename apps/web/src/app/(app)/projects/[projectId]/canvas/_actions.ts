"use server";

import { requireAuth } from "@lore/auth/guard";
import { requireOrgRole } from "@lore/auth/permissions";
import {
  db,
  characters,
  locations,
  factions,
  scenes,
  timelineEvents,
  members,
  projects,
  branches,
  aiRuns,
  agentFindings,
  and,
  asc,
  eq,
  isNull,
} from "@lore/db";
import { emitEntityUpdated } from "@/lib/inngest/emit";
import type {
  Character,
  Location,
  Faction,
  Scene,
  TimelineEvent,
  EntityType,
  AnyEntity,
  Branch,
} from "@lore/db";
import type { ActionResult } from "@lore/utils";
import { wizardEntitySchema, type WizardEntity } from "@lore/validators";

// ---------------------------------------------------------------------------
// Shared: project access guard
// Allows either explicit members row OR personal-org owner (matches
// canvas/page.tsx and /api/liveblocks-auth — the Phase 3.5 fix).
// ---------------------------------------------------------------------------

async function userCanAccessProject(
  projectId: string,
  userId: string,
  activeOrgId: string | null | undefined,
): Promise<{ ok: true; orgId: string } | { ok: false }> {
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project) return { ok: false };

  const [membership] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, project.orgId), eq(members.userId, userId)));
  if (membership) return { ok: true, orgId: project.orgId };

  if (project.orgId === activeOrgId) return { ok: true, orgId: project.orgId };

  return { ok: false };
}

// ---------------------------------------------------------------------------
// Table resolver
// ---------------------------------------------------------------------------

type EntityTable =
  | typeof characters
  | typeof locations
  | typeof factions
  | typeof scenes
  | typeof timelineEvents;

function tableFor(type: EntityType): EntityTable {
  switch (type) {
    case "character":
      return characters;
    case "location":
      return locations;
    case "faction":
      return factions;
    case "scene":
      return scenes;
    case "timeline_event":
      return timelineEvents;
  }
}

// ---------------------------------------------------------------------------
// listEntities
// ---------------------------------------------------------------------------

export async function listEntities(
  type: EntityType,
  branchId: string,
  orgId: string,
): Promise<ActionResult<AnyEntity[]>> {
  try {
    await requireAuth();
    const table = tableFor(type);
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.branchId, branchId), eq(table.orgId, orgId), isNull(table.deletedAt)));
    return { success: true, data: rows as AnyEntity[] };
  } catch (err) {
    // Re-throw Next.js redirect/not-found errors
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || err.message === "NEXT_NOT_FOUND")
    ) {
      throw err;
    }
    return { success: false, error: "Failed to load entities." };
  }
}

// ---------------------------------------------------------------------------
// createEntity
// ---------------------------------------------------------------------------

export async function createEntity(data: {
  type: EntityType;
  orgId: string;
  projectId: string;
  branchId: string;
  name: string;
}): Promise<ActionResult<AnyEntity>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  try {
    const { type, orgId, projectId, branchId, name } = data;

    let inserted: AnyEntity;

    if (type === "scene" || type === "timeline_event") {
      const table = type === "scene" ? scenes : timelineEvents;
      const [row] = await db
        .insert(table)
        .values({ orgId, projectId, branchId, title: name })
        .returning();
      inserted = row as Scene | TimelineEvent;
    } else {
      const table = tableFor(type) as typeof characters | typeof locations | typeof factions;
      const [row] = await db.insert(table).values({ orgId, projectId, branchId, name }).returning();
      inserted = row as Character | Location | Faction;
    }

    await emitEntityUpdated({
      orgId: data.orgId,
      projectId: data.projectId,
      branchId: data.branchId,
      entityId: inserted.id,
      entityType: data.type,
    });
    return { success: true, data: inserted };
  } catch {
    return { success: false, error: "Failed to create entity." };
  }
}

// ---------------------------------------------------------------------------
// createWizardEntity (Phase 8 AI wizard)
// Persists one fully-populated entity streamed by the Writer Agent. Re-validates
// the payload with the shared schema (defense in depth — the browser is the
// caller and the agents server already validated, but a tampered client could
// hit this action directly). Inserts every type-specific field in one row.
// ---------------------------------------------------------------------------

export async function createWizardEntity(data: {
  orgId: string;
  projectId: string;
  branchId: string;
  entity: WizardEntity;
}): Promise<ActionResult<AnyEntity>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  const parsed = wizardEntitySchema.safeParse(data.entity);
  if (!parsed.success) return { success: false, error: "Invalid entity." };

  const { orgId, projectId, branchId } = data;
  const base = { orgId, projectId, branchId };

  try {
    switch (parsed.data.entityType) {
      case "character": {
        const [row] = await db
          .insert(characters)
          .values({ ...base, ...parsed.data.data })
          .returning();
        return { success: true, data: row as Character };
      }
      case "location": {
        const [row] = await db
          .insert(locations)
          .values({ ...base, ...parsed.data.data })
          .returning();
        return { success: true, data: row as Location };
      }
      case "faction": {
        const [row] = await db
          .insert(factions)
          .values({ ...base, ...parsed.data.data })
          .returning();
        return { success: true, data: row as Faction };
      }
      case "scene": {
        const [row] = await db
          .insert(scenes)
          .values({ ...base, ...parsed.data.data })
          .returning();
        return { success: true, data: row as Scene };
      }
      case "timeline_event": {
        const [row] = await db
          .insert(timelineEvents)
          .values({ ...base, ...parsed.data.data })
          .returning();
        return { success: true, data: row as TimelineEvent };
      }
    }
  } catch {
    return { success: false, error: "Failed to create entity." };
  }
}

// ---------------------------------------------------------------------------
// updateEntity
// ---------------------------------------------------------------------------

export async function updateEntity(data: {
  type: EntityType;
  entityId: string;
  orgId: string;
  patch: Record<string, unknown>;
}): Promise<ActionResult<AnyEntity>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  try {
    const table = tableFor(data.type);
    const safePatch = { ...(data.patch as Record<string, unknown>) };
    for (const key of ["id", "orgId", "projectId", "branchId", "createdAt"]) {
      delete safePatch[key];
    }
    const [updated] = await db
      .update(table)
      .set({ ...safePatch, updatedAt: new Date() })
      .where(and(eq(table.id, data.entityId), eq(table.orgId, data.orgId)))
      .returning();

    if (!updated) return { success: false, error: "Entity not found." };

    await emitEntityUpdated({
      orgId: data.orgId,
      projectId: updated.projectId,
      branchId: updated.branchId,
      entityId: updated.id,
      entityType: data.type,
    });
    return { success: true, data: updated as AnyEntity };
  } catch {
    return { success: false, error: "Failed to update entity." };
  }
}

// ---------------------------------------------------------------------------
// acceptFieldSuggestion (Phase 7 on-demand AI)
// Writes an accepted AI suggestion into the entity field and flags the
// originating ai_runs row as accepted. The generation itself was already
// logged by the agents server (single sink); this only patches + flips the
// `accepted` bit so billing can tell kept generations from discarded ones.
// ---------------------------------------------------------------------------

// Fields that the wand can write to, per entity type. Mirrors the multiline
// fields in entity-panel's FIELD_CONFIG — guards against a tampered client
// patching name/title or some other column via this path.
const GENERATABLE_FIELDS: Record<EntityType, readonly string[]> = {
  character: ["bio", "backstory", "voiceSample"],
  location: ["description", "history"],
  faction: ["description", "goals"],
  scene: ["summary"],
  timeline_event: ["description"],
};

export async function acceptFieldSuggestion(data: {
  type: EntityType;
  entityId: string;
  orgId: string;
  fieldKey: string;
  value: string;
  aiRunId?: string | null;
}): Promise<ActionResult<AnyEntity>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  if (!GENERATABLE_FIELDS[data.type].includes(data.fieldKey)) {
    return { success: false, error: "Field is not AI-generatable." };
  }

  try {
    const table = tableFor(data.type);
    const [updated] = await db
      .update(table)
      .set({ [data.fieldKey]: data.value, updatedAt: new Date() })
      .where(and(eq(table.id, data.entityId), eq(table.orgId, data.orgId)))
      .returning();

    if (!updated) return { success: false, error: "Entity not found." };

    // Flag the run as accepted. Scoped to orgId so one org can't flip another's
    // row. Best-effort: if logging failed upstream aiRunId is null — the field
    // write still succeeds.
    if (data.aiRunId) {
      await db
        .update(aiRuns)
        .set({ accepted: true })
        .where(and(eq(aiRuns.id, data.aiRunId), eq(aiRuns.orgId, data.orgId)));
    }

    await emitEntityUpdated({
      orgId: data.orgId,
      projectId: updated.projectId,
      branchId: updated.branchId,
      entityId: updated.id,
      entityType: data.type,
    });
    return { success: true, data: updated as AnyEntity };
  } catch {
    return { success: false, error: "Failed to save suggestion." };
  }
}

// ---------------------------------------------------------------------------
// deleteEntity
// ---------------------------------------------------------------------------

export async function deleteEntity(data: {
  type: EntityType;
  entityId: string;
  orgId: string;
}): Promise<ActionResult<void>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  try {
    const table = tableFor(data.type);
    const [deleted] = await db
      .update(table)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(table.id, data.entityId), eq(table.orgId, data.orgId)))
      .returning();

    if (!deleted) return { success: false, error: "Entity not found." };

    // Sync-resolve open findings anchored to this entity so the dot + sidebar
    // clear immediately. A later background run would do this too via the
    // sweep, but waiting 10–30s for the next cycle would be visibly stale.
    await db
      .update(agentFindings)
      .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(agentFindings.entityId, data.entityId), eq(agentFindings.status, "open")));

    await emitEntityUpdated({
      orgId: data.orgId,
      projectId: deleted.projectId,
      branchId: deleted.branchId,
      entityId: deleted.id,
      entityType: data.type,
    });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete entity." };
  }
}

// ---------------------------------------------------------------------------
// getCanvasData
// ---------------------------------------------------------------------------

export async function getCanvasData(
  projectId: string,
): Promise<ActionResult<{ projectId: string; branchId: string; orgId: string }>> {
  const session = await requireAuth();

  try {
    // Fetch project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));

    if (!project) return { success: false, error: "Project not found." };

    const { orgId } = project;

    // Verify the user is a member of the org
    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.organizationId, orgId), eq(members.userId, session.user.id)));

    if (!membership) {
      return { success: false, error: "You are not a member of this organization." };
    }

    // Fetch the main branch
    const [branch] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.projectId, projectId), eq(branches.name, "main")));

    if (!branch) return { success: false, error: "Main branch not found." };

    return { success: true, data: { projectId, branchId: branch.id, orgId } };
  } catch {
    return { success: false, error: "Failed to load canvas data." };
  }
}

// ---------------------------------------------------------------------------
// Branch read/fork actions (Phase 4)
// ---------------------------------------------------------------------------

export type BranchSummary = {
  id: string;
  name: string;
  parentBranchId: string | null;
  createdAt: Date;
};

export async function listBranches(
  projectId: string,
  orgId: string,
): Promise<ActionResult<{ branches: BranchSummary[] }>> {
  const session = await requireAuth();

  try {
    const access = await userCanAccessProject(
      projectId,
      session.user.id,
      session.session.activeOrganizationId,
    );
    if (!access.ok || access.orgId !== orgId) {
      return { success: false, error: "Project not accessible." };
    }

    const rows = await db
      .select({
        id: branches.id,
        name: branches.name,
        parentBranchId: branches.parentBranchId,
        createdAt: branches.createdAt,
      })
      .from(branches)
      .where(and(eq(branches.projectId, projectId), eq(branches.orgId, orgId)))
      .orderBy(asc(branches.createdAt));

    return { success: true, data: { branches: rows } };
  } catch {
    return { success: false, error: "Failed to load branches." };
  }
}

// Copy all live rows of one entity table from a source branch to a new branch.
// Drops id/createdAt/updatedAt so Drizzle defaults regenerate them.
async function copyEntityTable(
  table: EntityTable,
  sourceBranchId: string,
  newBranchId: string,
  orgId: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(table)
    .where(
      and(eq(table.branchId, sourceBranchId), eq(table.orgId, orgId), isNull(table.deletedAt)),
    );
  if (rows.length === 0) return;

  const cloned = rows.map((row) => {
    const copy = { ...(row as Record<string, unknown>) };
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    copy.branchId = newBranchId;
    return copy;
  });

  // Union of insert-values across 5 tables isn't narrowable here.
  await db.insert(table).values(cloned as never);
}

export type ForkBranchError =
  | "name_required"
  | "name_too_long"
  | "duplicate_name"
  | "source_not_found"
  | "fork_failed";

export async function forkBranch(input: {
  projectId: string;
  orgId: string;
  sourceBranchId: string;
  name: string;
}): Promise<
  ActionResult<{
    branch: { id: string; name: string; parentBranchId: string; createdAt: Date };
  }>
> {
  const authResult = await requireOrgRole(input.orgId, "editor");
  if (!authResult.success) return authResult;

  const trimmed = input.name.trim();
  if (trimmed.length === 0) return { success: false, error: "name_required" };
  if (trimmed.length > 50) return { success: false, error: "name_too_long" };

  // Verify source branch belongs to (project, org).
  const [source] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        eq(branches.id, input.sourceBranchId),
        eq(branches.projectId, input.projectId),
        eq(branches.orgId, input.orgId),
      ),
    );
  if (!source) return { success: false, error: "source_not_found" };

  // Insert the new branch row. UNIQUE(project_id, name) catches duplicates.
  let newBranch: Branch | undefined;
  try {
    [newBranch] = await db
      .insert(branches)
      .values({
        projectId: input.projectId,
        orgId: input.orgId,
        name: trimmed,
        parentBranchId: input.sourceBranchId,
      })
      .returning();
  } catch (err) {
    const message = String((err as Error)?.message ?? "");
    if (
      message.includes("branches_project_id_name_unique") ||
      message.toLowerCase().includes("duplicate")
    ) {
      return { success: false, error: "duplicate_name" };
    }
    console.error("[forkBranch] insert branch failed", err);
    return { success: false, error: "fork_failed" };
  }
  if (!newBranch || !newBranch.parentBranchId) {
    return { success: false, error: "fork_failed" };
  }

  // neon-http has no transactions. Copy each table sequentially; on any
  // failure, delete inserted rows in reverse order and drop the branch row.
  const tablesInOrder: EntityTable[] = [characters, locations, factions, scenes, timelineEvents];
  const touched: EntityTable[] = [];

  try {
    for (const table of tablesInOrder) {
      await copyEntityTable(table, input.sourceBranchId, newBranch.id, input.orgId);
      touched.push(table);
    }
    return {
      success: true,
      data: {
        branch: {
          id: newBranch.id,
          name: newBranch.name,
          parentBranchId: newBranch.parentBranchId,
          createdAt: newBranch.createdAt,
        },
      },
    };
  } catch (err) {
    console.error("[forkBranch] copy failed; rolling back", err);
    for (const table of [...touched].reverse()) {
      try {
        await db.delete(table).where(eq(table.branchId, newBranch.id));
      } catch (rbErr) {
        console.error("[forkBranch] rollback delete failed", rbErr);
      }
    }
    try {
      await db.delete(branches).where(eq(branches.id, newBranch.id));
    } catch (rbErr) {
      console.error("[forkBranch] rollback branch delete failed", rbErr);
    }
    return { success: false, error: "fork_failed" };
  }
}
