import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelectLimit = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);

vi.mock("@lore/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectLimit,
        }),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  },
  organizations: { id: "id", slug: "slug" },
  members: { id: "id", userId: "user_id", organizationId: "organization_id" },
  and: (...args: unknown[]) => ({ and: args }),
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: () => "generated_id",
}));

import { resolveActiveOrgId } from "./active-org";

const user = { id: "user_1", name: "Ada", email: "ada@example.com" };

describe("resolveActiveOrgId", () => {
  beforeEach(() => {
    mockSelectLimit.mockReset();
    mockInsertValues.mockClear();
  });

  it("returns the active org from the session without touching the db", async () => {
    const result = await resolveActiveOrgId(user, "org_active");
    expect(result).toBe("org_active");
    expect(mockSelectLimit).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("falls back to the user's first membership when no active org", async () => {
    mockSelectLimit.mockResolvedValueOnce([{ organizationId: "org_member" }]);
    const result = await resolveActiveOrgId(user, null);
    expect(result).toBe("org_member");
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("creates a personal org + membership when the user has neither", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([]) // no membership
      .mockResolvedValueOnce([]) // no personal org by slug
      .mockResolvedValueOnce([]); // no member row for that org
    const result = await resolveActiveOrgId(user, null);
    expect(result).toBe("generated_id");
    // one org insert + one member insert
    expect(mockInsertValues).toHaveBeenCalledTimes(2);
  });

  it("adopts an existing orphan personal org instead of colliding on slug", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([]) // no membership
      .mockResolvedValueOnce([{ id: "org_orphan" }]) // personal org already exists
      .mockResolvedValueOnce([]); // but no member row yet
    const result = await resolveActiveOrgId(user, null);
    expect(result).toBe("org_orphan");
    // no org insert (adopted), only the membership insert
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });
});
