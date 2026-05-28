import { describe, it, expect, vi, beforeEach } from "vitest";

const insertCalls: unknown[][] = [];
const updateCalls: { setArg: unknown; whereArgs: unknown[] }[] = [];
let existingRows: Array<{
  id: string;
  agentType: string;
  entityId: string | null;
  message: string;
  status: "open" | "resolved" | "dismissed";
}> = [];

vi.mock("@lore/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({ where: () => Promise.resolve(existingRows) }),
    })),
    insert: vi.fn(() => ({
      values: (rows: unknown[]) => {
        insertCalls.push(rows);
        return Promise.resolve();
      },
    })),
    update: vi.fn(() => ({
      set: (setArg: unknown) => ({
        where: (...whereArgs: unknown[]) => {
          updateCalls.push({ setArg, whereArgs });
          return Promise.resolve();
        },
      }),
    })),
  },
  agentFindings: {
    projectId: "projectId",
    branchId: "branchId",
    agentType: "agentType",
    status: "status",
    id: "id",
  },
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
}));

const { upsertFindings } = await import("./upsert");

beforeEach(() => {
  insertCalls.length = 0;
  updateCalls.length = 0;
  existingRows = [];
});

describe("upsertFindings", () => {
  it("inserts a new finding when no existing row matches", async () => {
    existingRows = [];
    await upsertFindings({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      agentType: "continuity",
      aiRunId: "r1",
      payload: [
        { entityId: "c1", entityType: "character", severity: "error", message: "year mismatch xx" },
      ],
    });
    expect(insertCalls).toHaveLength(1);
    expect(updateCalls).toHaveLength(0);
  });

  it("no-ops when the same open finding already exists", async () => {
    existingRows = [
      {
        id: "f1",
        agentType: "continuity",
        entityId: "c1",
        message: "year mismatch xx",
        status: "open",
      },
    ];
    await upsertFindings({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      agentType: "continuity",
      aiRunId: "r1",
      payload: [
        { entityId: "c1", entityType: "character", severity: "error", message: "year mismatch xx" },
      ],
    });
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("reopens a previously-resolved finding when it reappears", async () => {
    existingRows = [
      {
        id: "f1",
        agentType: "continuity",
        entityId: "c1",
        message: "year mismatch xx",
        status: "resolved",
      },
    ];
    await upsertFindings({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      agentType: "continuity",
      aiRunId: "r1",
      payload: [
        { entityId: "c1", entityType: "character", severity: "error", message: "year mismatch xx" },
      ],
    });
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(1);
    expect((updateCalls[0]!.setArg as { status: string }).status).toBe("open");
  });

  it("leaves dismissed findings untouched even when they reappear", async () => {
    existingRows = [
      {
        id: "f1",
        agentType: "continuity",
        entityId: "c1",
        message: "year mismatch xx",
        status: "dismissed",
      },
    ];
    await upsertFindings({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      agentType: "continuity",
      aiRunId: "r1",
      payload: [
        { entityId: "c1", entityType: "character", severity: "error", message: "year mismatch xx" },
      ],
    });
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("sweeps stale open findings of the SAME agent_type to resolved", async () => {
    existingRows = [
      {
        id: "f-stale",
        agentType: "continuity",
        entityId: "c1",
        message: "old issue xxxxx",
        status: "open",
      },
      {
        id: "f-other",
        agentType: "pacing",
        entityId: null,
        message: "pacing issue xxxx",
        status: "open",
      },
    ];
    await upsertFindings({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      agentType: "continuity",
      aiRunId: "r1",
      payload: [], // new run found nothing
    });
    // Continuity stale row → resolved. Pacing row of a different agent_type → NOT touched.
    expect(updateCalls).toHaveLength(1);
    expect((updateCalls[0]!.setArg as { status: string }).status).toBe("resolved");
  });
});
