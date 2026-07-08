import { describe, it, expect, vi, beforeEach } from "vitest";

// Inngest send sink. emitEntityUpdated calls inngest.send under the hood.
// Typed to accept the event payload so .mock.calls is narrowable in assertions.
const sendMock = vi.fn(
  async (_payload: { name: string; data: Record<string, unknown> }) =>
    undefined,
);

// Two distinct db.update() consumers exist in deleteEntity:
//   1. the entity table update → .set().where().returning()  (returns [row])
//   2. agentFindings update      → .set().where()             (awaited, no returning)
// We model .where() as a thenable that ALSO exposes .returning(), so both
// call shapes resolve from the same chain factory.
const entityReturning = vi.fn(async () => [
  { id: "c1", projectId: "p1", branchId: "b1" },
]);
const findingsWhere = vi.fn(async () => undefined);

vi.mock("@/inngest/client", () => ({ inngest: { send: sendMock } }));

vi.mock("@lore/auth/permissions", () => ({
  requireOrgRole: vi.fn(async () => ({
    success: true,
    data: { userId: "u1" },
  })),
}));
vi.mock("@lore/auth/guard", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1" }, session: {} })),
}));

// db.update() is called once in updateEntity, twice in deleteEntity (entity
// table, then agentFindings). Track the call index to return the right chain.
let updateCall = 0;
vi.mock("@lore/db", () => {
  const tableStub = { id: "id", orgId: "orgId" };
  return {
    db: {
      update: vi.fn(() => {
        updateCall += 1;
        if (updateCall === 1) {
          // entity table update → .set().where().returning()
          return {
            set: () => ({ where: () => ({ returning: entityReturning }) }),
          };
        }
        // agentFindings update → .set().where()  (awaited directly)
        return { set: () => ({ where: findingsWhere }) };
      }),
      insert: vi.fn(() => ({
        values: () => ({
          returning: vi.fn(async () => [
            { id: "c1", projectId: "p1", branchId: "b1" },
          ]),
        }),
      })),
      select: vi.fn(),
    },
    agentFindings: { entityId: "entityId", status: "status" },
    aiRuns: { id: "id", orgId: "orgId" },
    characters: tableStub,
    locations: tableStub,
    factions: tableStub,
    scenes: tableStub,
    timelineEvents: tableStub,
    members: tableStub,
    projects: tableStub,
    branches: tableStub,
    and: (...args: unknown[]) => args,
    asc: (x: unknown) => x,
    eq: (a: unknown, b: unknown) => [a, b],
    isNull: (x: unknown) => x,
  };
});

vi.mock("@lore/validators", () => {
  // _actions builds ENTITY_PATCH_SCHEMAS at import time via `.partial()` on each
  // wizard field schema, then validates patches through `.safeParse()`. Mirror
  // that shape: `.partial()` yields a schema that passes a valid patch straight
  // through, which is all these tests exercise.
  const passthrough = {
    partial: () => ({
      safeParse: (v: unknown) => ({ success: true, data: v }),
    }),
  };
  return {
    wizardEntitySchema: { safeParse: vi.fn() },
    wizardCharacterData: passthrough,
    wizardLocationData: passthrough,
    wizardFactionData: passthrough,
    wizardSceneData: passthrough,
    wizardTimelineEventData: passthrough,
  };
});

const { deleteEntity, updateEntity } = await import("./_actions");

beforeEach(() => {
  vi.clearAllMocks();
  updateCall = 0;
  entityReturning.mockResolvedValue([
    { id: "c1", projectId: "p1", branchId: "b1" },
  ]);
});

describe("deleteEntity (Phase 10 wiring)", () => {
  it("sync-resolves related open findings AND emits entity.updated", async () => {
    const out = await deleteEntity({
      type: "character",
      entityId: "c1",
      orgId: "o1",
    });

    expect(out.success).toBe(true);
    // findings update happened exactly once
    expect(findingsWhere).toHaveBeenCalledTimes(1);
    // event emitted exactly once
    expect(sendMock).toHaveBeenCalledTimes(1);

    const sent = sendMock.mock.calls[0]![0] as {
      name: string;
      data: {
        entityId: string;
        projectId: string;
        branchId: string;
        orgId: string;
      };
    };
    expect(sent.name).toBe("entity.updated");
    expect(sent.data.entityId).toBe("c1");
    expect(sent.data.projectId).toBe("p1");
    expect(sent.data.branchId).toBe("b1");
    expect(sent.data.orgId).toBe("o1");
  });

  it("does NOT emit when the entity is not found", async () => {
    entityReturning.mockResolvedValueOnce([]);
    const out = await deleteEntity({
      type: "character",
      entityId: "missing",
      orgId: "o1",
    });

    expect(out.success).toBe(false);
    expect(findingsWhere).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("updateEntity (Phase 10 wiring)", () => {
  it("emits entity.updated with the correct payload", async () => {
    const out = await updateEntity({
      type: "character",
      entityId: "c1",
      orgId: "o1",
      patch: { bio: "new" },
    });

    expect(out.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);

    const sent = sendMock.mock.calls[0]![0] as {
      name: string;
      data: {
        entityId: string;
        projectId: string;
        branchId: string;
        orgId: string;
        entityType: string;
      };
    };
    expect(sent.name).toBe("entity.updated");
    expect(sent.data).toEqual({
      orgId: "o1",
      projectId: "p1",
      branchId: "b1",
      entityId: "c1",
      entityType: "character",
    });
  });
});
