"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, subscriptions, eq } from "@lore/db";
import { requireOrgRole } from "@lore/auth/permissions";
import type { ActionResult } from "@lore/utils";
import { ROUTES } from "@lore/utils";

const PRO_PERIOD_DAYS = 30;

const StartCheckoutSchema = z.object({
  orgId: z.string().min(1),
});

// Returns the URL the client should navigate to next. In stub mode this is the
// local checkout-stub page. When Moyasar is wired this returns the hosted
// checkout URL instead — same shape, swappable behind an env flag.
export async function startCheckoutAction(
  input: unknown,
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    const data = StartCheckoutSchema.parse(input);
    const authResult = await requireOrgRole(data.orgId, "owner");
    if (!authResult.success) return authResult;

    const checkoutUrl = `${ROUTES.settings.billing}/checkout-stub?orgId=${encodeURIComponent(data.orgId)}`;
    return { success: true, data: { checkoutUrl } };
  } catch (err) {
    console.error("[startCheckoutAction]", err);
    return { success: false, error: "Failed to start checkout." };
  }
}

const ConfirmStubSchema = z.object({
  orgId: z.string().min(1),
});

// Stub-only: simulates a successful payment by upserting an active pro
// subscription. Real Moyasar flow replaces this with the webhook handler doing
// the upsert from a verified Moyasar event.
export async function confirmStubCheckoutAction(input: unknown): Promise<void> {
  const data = ConfirmStubSchema.parse(input);
  const authResult = await requireOrgRole(data.orgId, "owner");
  if (!authResult.success) {
    redirect(`${ROUTES.settings.billing}?error=forbidden`);
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + PRO_PERIOD_DAYS);

  await db
    .insert(subscriptions)
    .values({
      orgId: data.orgId,
      plan: "pro",
      status: "active",
      currentPeriodEnd: periodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.orgId,
      set: {
        plan: "pro",
        status: "active",
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      },
    });

  revalidatePath(ROUTES.settings.billing);
  redirect(`${ROUTES.settings.billing}?upgraded=1`);
}

const CancelSchema = z.object({
  orgId: z.string().min(1),
});

// Cancellation does not revoke access immediately — the gate continues to
// allow pro features until currentPeriodEnd. The row is kept around so the
// billing UI can show "Access until <date>".
export async function cancelSubscriptionAction(
  input: unknown,
): Promise<ActionResult<{ cancelledUntil: Date }>> {
  try {
    const data = CancelSchema.parse(input);
    const authResult = await requireOrgRole(data.orgId, "owner");
    if (!authResult.success) return authResult;

    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, data.orgId))
      .limit(1);

    if (!row) return { success: false, error: "No active subscription to cancel." };
    if (row.status === "cancelled") {
      return { success: true, data: { cancelledUntil: row.currentPeriodEnd } };
    }

    const [updated] = await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.orgId, data.orgId))
      .returning();

    if (!updated) return { success: false, error: "Failed to cancel subscription." };

    revalidatePath(ROUTES.settings.billing);
    return { success: true, data: { cancelledUntil: updated.currentPeriodEnd } };
  } catch (err) {
    console.error("[cancelSubscriptionAction]", err);
    return { success: false, error: "Failed to cancel subscription." };
  }
}
