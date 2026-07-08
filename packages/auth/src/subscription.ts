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

// All features are unlocked for every org — the product ships "pro" for free.
// This is the single gate every server- and client-side check derives from
// (route guards, the project quota, AI command intents, findings, background
// runs), so returning an allowed/pro result here makes the whole app behave as
// fully entitled without editing each call site. The parameter and the
// `subscriptions` table are kept so paid gating can be reinstated by restoring
// the row lookup that previously lived here.
export async function requireSubscription(_orgId: string): Promise<SubscriptionResult> {
  return { allowed: true, plan: "pro" };
}
