import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/ai", () => ({
  generateModelObject: vi.fn(),
  MODELS: {
    sonnet: "claude-sonnet-4-6",
    opus: "claude-opus-4-7",
    haiku: "claude-haiku-4-5",
  },
}));

const { runContinuityAgent, buildContinuityPrompt } =
  await import("./continuity");
const { generateModelObject } = await import("@lore/ai");

beforeEach(() => vi.clearAllMocks());

describe("buildContinuityPrompt", () => {
  it("mentions the severity rubric", () => {
    const { system } = buildContinuityPrompt({
      projectId: "p",
      branchId: "b",
      entities: [],
    });
    expect(system).toMatch(/error/i);
    expect(system).toMatch(/warning/i);
    expect(system).toMatch(/info/i);
  });

  it("includes the entity list as JSON", () => {
    const { prompt } = buildContinuityPrompt({
      projectId: "p",
      branchId: "b",
      entities: [{ id: "c1", type: "character", name: "Ahmad" }],
    });
    expect(prompt).toContain('"Ahmad"');
  });
});

describe("runContinuityAgent", () => {
  it("returns parsed findings and model metadata", async () => {
    (
      generateModelObject as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      object: {
        findings: [
          {
            entityId: "c1",
            entityType: "character",
            severity: "error",
            message: "Born 1850 but fought in 1820 war.",
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 20 },
      latencyMs: 250,
    });

    const out = await runContinuityAgent({
      projectId: "p",
      branchId: "b",
      entities: [{ id: "c1", type: "character", name: "Ahmad" }],
    });

    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]!.severity).toBe("error");
    expect(out.model).toBe("claude-sonnet-4-6");
    expect(out.latencyMs).toBe(250);
  });

  it("returns empty findings when the model returns []", async () => {
    (
      generateModelObject as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      object: { findings: [] },
      usage: { inputTokens: 50, outputTokens: 5 },
      latencyMs: 100,
    });

    const out = await runContinuityAgent({
      projectId: "p",
      branchId: "b",
      entities: [],
    });
    expect(out.findings).toEqual([]);
  });
});
