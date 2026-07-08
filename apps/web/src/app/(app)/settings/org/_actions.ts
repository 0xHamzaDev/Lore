"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@lore/auth";
import { requireOrgRole } from "@lore/auth/permissions";
import type { ActionResult } from "@lore/utils";

const InviteMemberSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
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

export async function updateMemberRoleAction(
  input: unknown,
): Promise<ActionResult<void>> {
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

export async function removeMemberAction(
  input: unknown,
): Promise<ActionResult<void>> {
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

const UpdateOrgSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

export async function updateOrgAction(
  input: unknown,
): Promise<ActionResult<{ name: string }>> {
  try {
    const data = UpdateOrgSchema.parse(input);
    const perm = await requireOrgRole(data.orgId, "owner");
    if (!perm.success) return perm;

    const h = await headers();
    await auth.api.updateOrganization({
      headers: h,
      body: {
        organizationId: data.orgId,
        data: { name: data.name },
      },
    });

    revalidatePath("/settings/org");
    return { success: true, data: { name: data.name } };
  } catch (err) {
    console.error("[updateOrgAction]", err);
    return { success: false, error: "Failed to update workspace." };
  }
}

const CancelInvitationSchema = z.object({
  orgId: z.string().min(1),
  invitationId: z.string().min(1),
});

export async function cancelInvitationAction(
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const data = CancelInvitationSchema.parse(input);
    const perm = await requireOrgRole(data.orgId, "owner");
    if (!perm.success) return perm;

    const h = await headers();
    await auth.api.cancelInvitation({
      headers: h,
      body: { invitationId: data.invitationId },
    });

    revalidatePath("/settings/org");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[cancelInvitationAction]", err);
    return { success: false, error: "Failed to cancel invitation." };
  }
}
