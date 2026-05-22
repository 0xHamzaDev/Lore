"use server";

import { requireAuth } from "@lore/auth/guard";
import { requireOrgRole } from "@lore/auth/permissions";
import { requireSubscription } from "@lore/auth/subscription";
import { db, projects, branches } from "@lore/db";
import type { Project, Branch } from "@lore/db";
import type { ActionResult } from "@lore/utils";
import { and, count, eq, isNull } from "@lore/db";
import { z } from "zod";

const nameSchema = z.string().min(1).max(100);

export async function listProjects(orgId: string): Promise<ActionResult<Project[]>> {
  await requireAuth(); // must NOT be inside try/catch — Next.js redirect() throws internally
  try {
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

  const trimmed = data.name.trim();
  const parsed = nameSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { success: false, error: "Project name must be between 1 and 100 characters." };
  }

  try {
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

    const { project, branch } = await db.transaction(async (tx) => {
      const [proj] = await tx
        .insert(projects)
        .values({ orgId: data.orgId, name: trimmed })
        .returning();
      const [br] = await tx
        .insert(branches)
        .values({ projectId: proj!.id, orgId: data.orgId, name: "main" })
        .returning();
      return { project: proj!, branch: br! };
    });

    return { success: true, data: { project, branch } };
  } catch {
    return { success: false, error: "Failed to create project." };
  }
}

export async function renameProject(data: {
  projectId: string;
  orgId: string;
  name: string;
}): Promise<ActionResult<Project>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  const trimmed = data.name.trim();
  const parsed = nameSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { success: false, error: "Project name must be between 1 and 100 characters." };
  }

  try {
    const [updated] = await db
      .update(projects)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)))
      .returning();

    if (!updated) return { success: false, error: "Project not found." };
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to rename project." };
  }
}

export async function deleteProject(data: {
  projectId: string;
  orgId: string;
}): Promise<ActionResult<void>> {
  const authResult = await requireOrgRole(data.orgId, "editor");
  if (!authResult.success) return authResult;

  try {
    await db
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)));

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete project." };
  }
}
