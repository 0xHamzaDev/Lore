import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAuthMock = vi.fn();
const requireOrgRoleMock = vi.fn();
const requireSubscriptionMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@lore/auth/guard", () => ({ requireAuth: requireAuthMock }));
vi.mock("@lore/auth/permissions", () => ({ requireOrgRole: requireOrgRoleMock }));
vi.mock("@lore/auth/subscription", () => ({ requireSubscription: requireSubscriptionMock }));
vi.mock("@lore/db", () => ({
  db: { select: selectMock },
  agentFindings: {},
  aiRuns: {},
  projects: { id: "id", orgId: "orgId" },
  // Operators are no-ops in tests — the chainable selectMock ignores its args.
  and: (...args: unknown[]) => args,
  desc: (x: unknown) => x,
  eq: (...args: unknown[]) => args,
}));

const { GET } = await import("./route");

function urlFor(projectId: string, branchId: string): Request {
  return new Request(`http://x/api/findings?projectId=${projectId}&branchId=${branchId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthMock.mockResolvedValue({ success: true, data: { userId: "u1" } });
  requireOrgRoleMock.mockResolvedValue({ success: true, data: { userId: "u1" } });
  requireSubscriptionMock.mockResolvedValue({ allowed: true, plan: "pro" });
  // Default: project lookup returns one row with orgId=o1.
  selectMock.mockImplementation(() => ({
    from: () => ({
      where: () => ({ limit: () => Promise.resolve([{ orgId: "o1" }]) }),
    }),
  }));
});

describe("GET /api/findings", () => {
  it("returns 401 when not authed", async () => {
    requireAuthMock.mockResolvedValue({ success: false, error: "unauthorized" });
    const res = await GET(urlFor("p1", "b1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when projectId or branchId is missing", async () => {
    const res = await GET(new Request("http://x/api/findings"));
    expect(res.status).toBe(400);
  });

  it("returns freeTeaser:true for free orgs and no findings", async () => {
    requireSubscriptionMock.mockResolvedValue({ allowed: false, plan: "free" });
    const res = await GET(urlFor("p1", "b1"));
    const body = await res.json();
    expect(body).toMatchObject({ findings: [], runStatus: null, freeTeaser: true });
  });
});
