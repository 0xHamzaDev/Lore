import type { ActionResult } from "@lore/utils";
import type { OrgRole } from "@lore/db";
import { requireAuth } from "./guard";
import { auth } from ".";
import { headers } from "next/headers";

const ROLE_WEIGHT: Record<OrgRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export async function requireOrgRole(
  orgId: string,
  minRole: OrgRole,
): Promise<ActionResult<{ userId: string; orgId: string; role: OrgRole }>> {
  try {
    const session = await requireAuth();
    const h = await headers();

    const fullOrg = await auth.api.getFullOrganization({
      headers: h,
      query: { organizationId: orgId },
    });

    const membership = fullOrg?.members.find(
      (m) => m.userId === session.user.id,
    );

    if (!membership) {
      return {
        success: false,
        error: "You are not a member of this organization.",
      };
    }

    const userRole = membership.role as OrgRole;
    if (ROLE_WEIGHT[userRole] < ROLE_WEIGHT[minRole]) {
      return { success: false, error: "Insufficient permissions." };
    }

    return {
      success: true,
      data: { userId: session.user.id, orgId, role: userRole },
    };
  } catch {
    return { success: false, error: "Authentication failed." };
  }
}
