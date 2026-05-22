import { describe, it, expect } from "vitest";
import { requireSubscription } from "./subscription";

describe("requireSubscription (Phase 2 stub)", () => {
  it("returns allowed: true for any org", async () => {
    const result = await requireSubscription("org_123");
    expect(result.allowed).toBe(true);
  });

  it("always returns plan: free", async () => {
    const result = await requireSubscription("org_123");
    expect(result.plan).toBe("free");
  });

  it("returns the same result for any orgId", async () => {
    const a = await requireSubscription("org_a");
    const b = await requireSubscription("org_b");
    expect(a).toEqual(b);
  });
});
