import { db, subscriptions } from "@lore/db";
import { eq } from "drizzle-orm";

export type SubscriptionPlan = "free" | "pro";

export type SubscriptionResult = {
  allowed: boolean;
  plan: SubscriptionPlan;
  /**
   * Why the gate denied. Only present when `allowed` is false. UI surfaces
   * this in the upgrade modal so the reason is specific (e.g. "second project
   * requires pro" vs. "AI features require pro").
   */
  reason?: string;
  /**
   * Set when the org has a row whose `status='cancelled'` but `currentPeriodEnd`
   * hasn't passed yet — access continues, but the UI should show the
   * lapsing-soon state.
   */
  cancelledUntil?: Date;
};

// Absence of a row = free plan (never inserted). A row with
// status='active' = pro. status='cancelled' keeps access until currentPeriodEnd.
// status='past_due' loses access immediately.
export async function requireSubscription(
  orgId: string,
): Promise<SubscriptionResult> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);

  if (!row) {
    return { allowed: false, plan: "free" };
  }

  if (row.status === "active") {
    return { allowed: true, plan: "pro" };
  }

  if (row.status === "cancelled" && row.currentPeriodEnd > new Date()) {
    return {
      allowed: true,
      plan: "pro",
      cancelledUntil: row.currentPeriodEnd,
    };
  }

  return { allowed: false, plan: "free" };
}
