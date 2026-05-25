import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/db", () => {
  return {
    db: { select: vi.fn() },
    characters: {
      id: "id",
      orgId: "orgId",
      branchId: "branchId",
      deletedAt: "deletedAt",
      name: "name",
      bio: "bio",
    },
    locations: {
      id: "id",
      orgId: "orgId",
      branchId: "branchId",
      deletedAt: "deletedAt",
      name: "name",
      description: "description",
    },
    factions: {
      id: "id",
      orgId: "orgId",
      branchId: "branchId",
      deletedAt: "deletedAt",
      name: "name",
      description: "description",
    },
    scenes: {
      id: "id",
      orgId: "orgId",
      branchId: "branchId",
      deletedAt: "deletedAt",
      title: "title",
      summary: "summary",
    },
    timelineEvents: {
      id: "id",
      orgId: "orgId",
      branchId: "branchId",
      deletedAt: "deletedAt",
      title: "title",
      description: "description",
    },
    and: (...args: unknown[]) => args,
    eq: (...args: unknown[]) => args,
    isNull: (...args: unknown[]) => args,
  };
});

const { buildAgentContext } = await import("./context");

describe("buildAgentContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns orgId, projectId, branchId, and a flattened entity array", async () => {
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

    const ctx = await buildAgentContext({ orgId: "o1", projectId: "p1", branchId: "b1" });

    expect(ctx.orgId).toBe("o1");
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

  it("calls db.select with an explicit column projection per table", async () => {
    const { db } = await import("@lore/db");
    (db.select as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([]) }),
    }));

    await buildAgentContext({ orgId: "o1", projectId: "p1", branchId: "b1" });

    expect(db.select as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(5);
    // Every call's first arg should be a non-undefined column projection
    // object — guards against regressing to `db.select()` (full rows).
    for (const call of (db.select as unknown as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0]).toBeDefined();
      expect(typeof call[0]).toBe("object");
    }
  });
});
