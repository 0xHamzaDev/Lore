import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/db", () => {
  return {
    db: { select: vi.fn() },
    characters: { branchId: "branchId", deletedAt: "deletedAt" },
    locations: { branchId: "branchId", deletedAt: "deletedAt" },
    factions: { branchId: "branchId", deletedAt: "deletedAt" },
    scenes: { branchId: "branchId", deletedAt: "deletedAt" },
    timelineEvents: { branchId: "branchId", deletedAt: "deletedAt" },
    and: (...args: unknown[]) => args,
    eq: (...args: unknown[]) => args,
    isNull: (...args: unknown[]) => args,
  };
});

const { buildAgentContext } = await import("./context");

describe("buildAgentContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns projectId, branchId, and a flattened entity array", async () => {
    const { db } = await import("@lore/db");
    // Mock rows mirror the real schema column names: scenes + timelineEvents
    // use `title`, others use `name`. The loader projects them all to the
    // CompactEntity shape {id, type, name, hint?}.
    const rows = [
      [{ id: "c1", name: "Ahmad", bio: "warrior" }],
      [{ id: "l1", name: "Damascus", description: null }],
      [{ id: "f1", name: "Order", description: null }],
      [{ id: "s1", title: "Opening", summary: null }],
      [{ id: "t1", title: "Founding", description: null }],
    ];
    let call = 0;
    (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve(rows[call++]) }),
    }));

    const ctx = await buildAgentContext({ projectId: "p1", branchId: "b1" });

    expect(ctx.projectId).toBe("p1");
    expect(ctx.branchId).toBe("b1");
    expect(ctx.entities).toHaveLength(5);
    expect(ctx.entities.map((e) => e.type)).toEqual([
      "character",
      "location",
      "faction",
      "scene",
      "timeline_event",
    ]);
    expect(ctx.entities[0]).toMatchObject({ id: "c1", type: "character", name: "Ahmad" });
    expect(ctx.entities[3]).toMatchObject({ id: "s1", type: "scene", name: "Opening" });
    expect(ctx.entities[4]).toMatchObject({ id: "t1", type: "timeline_event", name: "Founding" });
  });
});
