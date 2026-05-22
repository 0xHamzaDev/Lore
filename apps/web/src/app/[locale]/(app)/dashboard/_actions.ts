"use server";

import { requireAuth } from "@lore/auth/guard";
import { requireOrgRole } from "@lore/auth/permissions";
import { requireSubscription } from "@lore/auth/subscription";
import { db, projects, branches } from "@lore/db";
import type { Project, Branch } from "@lore/db";
import type { ActionResult } from "@lore/utils";
import { and, count, eq, isNull } from "@lore/db";

export async function listProjects(orgId: string): Promise<ActionResult<Project[]>> {
  try {
    await requireAuth();
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.orgId, orgId), isNull(projects.deletedAt)))
      .orderBy(projects.updatedAt);
    return { success: true, data: rows };
  } catch {
    return { success: false, error: "Failed to load projects." };
  }
}

export async function createProject(data: {
  orgId: string;
  name: string;
}): Promise<ActionResult<{ project: Project; branch: Branch }>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  const sub = await requireSubscription(data.orgId);
  if (sub.plan === "free") {
    const countRows = await db
      .select({ value: count() })
      .from(projects)
      .where(and(eq(projects.orgId, data.orgId), isNull(projects.deletedAt)));
    const value = countRows[0]?.value ?? 0;
    if (value >= 1) {
      return { success: false, error: "upgrade_required" };
    }
  }

  const projectRows = await db
    .insert(projects)
    .values({ orgId: data.orgId, name: data.name.trim() })
    .returning();
  const project = projectRows[0]!;

  const branchRows = await db
    .insert(branches)
    .values({ projectId: project.id, orgId: data.orgId, name: "main" })
    .returning();
  const branch = branchRows[0]!;

  return { success: true, data: { project, branch } };
}

export async function renameProject(data: {
  projectId: string;
  orgId: string;
  name: string;
}): Promise<ActionResult<Project>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  const [updated] = await db
    .update(projects)
    .set({ name: data.name.trim(), updatedAt: new Date() })
    .where(and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)))
    .returning();

  if (!updated) return { success: false, error: "Project not found." };
  return { success: true, data: updated };
}

export async function deleteProject(data: {
  projectId: string;
  orgId: string;
}): Promise<ActionResult<void>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)));

  return { success: true, data: undefined };
}
