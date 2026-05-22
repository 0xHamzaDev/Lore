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
  and,
  eq,
  isNull,
} from "@lore/db";
import type {
  Character,
  Location,
  Faction,
  Scene,
  TimelineEvent,
  EntityType,
  AnyEntity,
} from "@lore/db";
import type { ActionResult } from "@lore/utils";

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

    return { success: true, data: inserted };
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
    return { success: true, data: updated as AnyEntity };
  } catch {
    return { success: false, error: "Failed to update entity." };
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
