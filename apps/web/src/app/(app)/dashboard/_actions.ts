"use server";

import { requireOrgRole } from "@lore/auth/permissions";
import { requireSubscription } from "@lore/auth/subscription";
import { db, projects, branches } from "@lore/db";
import type { Project, Branch } from "@lore/db";
import type { ActionResult } from "@lore/utils";
import { and, count, eq, isNull } from "@lore/db";
import { z } from "zod";

const nameSchema = z.string().min(1).max(100);

export async function listProjects(
  orgId: string,
): Promise<ActionResult<Project[]>> {
  // Authz, not just authn: verify org membership before returning rows.
  // orgId is client-supplied, so authn alone is an IDOR (any signed-in user
  // could read another org's projects).
  const authResult = await requireOrgRole(orgId, "viewer");
  if (!authResult.success) return authResult;
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
    return {
      success: false,
      error: "Project name must be between 1 and 100 characters.",
    };
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

    // neon-http does not support transactions; do sequential inserts and best-effort rollback.
    const [project] = await db
      .insert(projects)
      .values({ orgId: data.orgId, name: trimmed })
      .returning();
    if (!project) return { success: false, error: "Failed to create project." };

    let branch: Branch | undefined;
    try {
      [branch] = await db
        .insert(branches)
        .values({ projectId: project.id, orgId: data.orgId, name: "main" })
        .returning();
    } catch (err) {
      // Soft-delete the orphan project so the user can retry without polluting the dashboard.
      await db
        .update(projects)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, project.id));
      throw err;
    }
    if (!branch) return { success: false, error: "Failed to create project." };

    return { success: true, data: { project, branch } };
  } catch (err) {
    console.error("[createProject] failed", err);
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
    return {
      success: false,
      error: "Project name must be between 1 and 100 characters.",
    };
  }

  try {
    const [updated] = await db
      .update(projects)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(
        and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)),
      )
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
      .where(
        and(eq(projects.id, data.projectId), eq(projects.orgId, data.orgId)),
      );

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete project." };
  }
}
