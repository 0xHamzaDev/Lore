import { describe, it, expect } from "vitest";

import { requireSubscription } from "./subscription";

// The product ships "pro" for free: requireSubscription is now an unconditional
// unlock (the subscriptions table and billing code are retained so paid gating
// can be reinstated later). These tests pin that behavior so a future change
// that silently re-introduces gating fails loudly. No DB mock is needed because
// the function no longer queries the subscriptions table.
describe("requireSubscription (pro unlocked for everyone)", () => {
  it("returns allowed: true, plan: pro for any org", async () => {
    const result = await requireSubscription("org_123");
    expect(result).toEqual({ allowed: true, plan: "pro" });
  });

  it("unlocks an org that has no subscription row", async () => {
    const result = await requireSubscription("org_without_row");
    expect(result).toEqual({ allowed: true, plan: "pro" });
  });

  it("never denies, for any org id", async () => {
    for (const orgId of ["a", "b", "c", ""]) {
      const result = await requireSubscription(orgId);
      expect(result.allowed).toBe(true);
      expect(result.plan).toBe("pro");
    }
  });
});
