"use server";

import { db, agentFindings, projects, eq } from "@lore/db";
import { requireOrgRole } from "@lore/auth/permissions";
import type { ActionResult } from "@lore/utils";

// Editor-only mutation. We look up the orgId from the finding's project to
// avoid trusting an orgId from the browser. The finding's status is set to
// 'dismissed' — sticky; agents will never reopen it.
export async function dismissFinding(input: { findingId: string }): Promise<ActionResult<void>> {
  const [row] = await db
    .select({ projectId: agentFindings.projectId })
    .from(agentFindings)
    .where(eq(agentFindings.id, input.findingId))
    .limit(1);
  if (!row) return { success: false, error: "Finding not found." };

  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, row.projectId))
    .limit(1);
  if (!project) return { success: false, error: "Project not found." };

  const role = await requireOrgRole(project.orgId, "editor");
  if (!role.success) return role;

  await db
    .update(agentFindings)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(eq(agentFindings.id, input.findingId));

  return { success: true, data: undefined };
}
