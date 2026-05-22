export async function requireSubscription(
  _orgId: string,
): Promise<{ allowed: boolean; plan: "free" | "pro" }> {
  // Phase 2 stub — always returns free. Phase 5 wires real Moyasar subscription data.
  return { allowed: true, plan: "free" };
}
