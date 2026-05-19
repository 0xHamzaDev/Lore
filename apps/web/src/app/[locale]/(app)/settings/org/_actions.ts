"use server";
import { auth } from "@lore/auth";
import { requireOrgRole } from "@lore/auth/permissions";
import type { ActionResult } from "@lore/utils";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const InviteMemberSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export async function inviteMemberAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const data = InviteMemberSchema.parse(input);
    const perm = await requireOrgRole(data.orgId, "owner");
    if (!perm.success) return perm;

    const h = await headers();
    const result = (await auth.api.createInvitation({
      headers: h,
      body: {
        organizationId: data.orgId,
        email: data.email,
        role: data.role as unknown as "owner",
      },
    })) as { id: string };

    revalidatePath("/settings/org");
    return { success: true, data: { id: result.id } };
  } catch (err) {
    console.error("[inviteMemberAction]", err);
    return { success: false, error: "Failed to send invitation." };
  }
}

const UpdateRoleSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["editor", "viewer"]),
});

export async function updateMemberRoleAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const data = UpdateRoleSchema.parse(input);
    const perm = await requireOrgRole(data.orgId, "owner");
    if (!perm.success) return perm;

    const h = await headers();
    await auth.api.updateMemberRole({
      headers: h,
      body: {
        organizationId: data.orgId,
        memberId: data.memberId,
        role: data.role,
      },
    });

    revalidatePath("/settings/org");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[updateMemberRoleAction]", err);
    return { success: false, error: "Failed to update role." };
  }
}

const RemoveMemberSchema = z.object({
  orgId: z.string().min(1),
  memberId: z.string().min(1),
});

export async function removeMemberAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const data = RemoveMemberSchema.parse(input);
    const perm = await requireOrgRole(data.orgId, "owner");
    if (!perm.success) return perm;

    const h = await headers();
    await auth.api.removeMember({
      headers: h,
      body: {
        organizationId: data.orgId,
        memberIdOrEmail: data.memberId,
      },
    });

    revalidatePath("/settings/org");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[removeMemberAction]", err);
    return { success: false, error: "Failed to remove member." };
  }
}
