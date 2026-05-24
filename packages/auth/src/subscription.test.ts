import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();

vi.mock("@lore/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelect,
        }),
      }),
    }),
  },
  subscriptions: { orgId: "org_id" },
}));

import { requireSubscription } from "./subscription";

describe("requireSubscription", () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it("returns allowed: false, plan: free when no row exists", async () => {
    mockSelect.mockResolvedValueOnce([]);
    const result = await requireSubscription("org_123");
    expect(result).toEqual({ allowed: false, plan: "free" });
  });

  it("returns allowed: true, plan: pro for active subscription", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        orgId: "org_123",
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      },
    ]);
    const result = await requireSubscription("org_123");
    expect(result.allowed).toBe(true);
    expect(result.plan).toBe("pro");
  });

  it("keeps access for cancelled subscription before period end", async () => {
    const periodEnd = new Date(Date.now() + 86_400_000);
    mockSelect.mockResolvedValueOnce([
      {
        orgId: "org_123",
        plan: "pro",
        status: "cancelled",
        currentPeriodEnd: periodEnd,
      },
    ]);
    const result = await requireSubscription("org_123");
    expect(result.allowed).toBe(true);
    expect(result.plan).toBe("pro");
    expect(result.cancelledUntil).toEqual(periodEnd);
  });

  it("revokes access for cancelled subscription after period end", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        orgId: "org_123",
        plan: "pro",
        status: "cancelled",
        currentPeriodEnd: new Date(Date.now() - 86_400_000),
      },
    ]);
    const result = await requireSubscription("org_123");
    expect(result).toEqual({ allowed: false, plan: "free" });
  });

  it("revokes access for past_due subscription", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        orgId: "org_123",
        plan: "pro",
        status: "past_due",
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      },
    ]);
    const result = await requireSubscription("org_123");
    expect(result).toEqual({ allowed: false, plan: "free" });
  });
});
