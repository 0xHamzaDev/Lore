import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/ai", () => ({
  generateModelObject: vi.fn(),
  MODELS: { sonnet: "claude-sonnet-4-6", opus: "claude-opus-4-7", haiku: "claude-haiku-4-5" },
}));

const { runPacingAgent, buildPacingPrompt } = await import("./pacing");
const { generateModelObject } = await import("@lore/ai");

beforeEach(() => vi.clearAllMocks());

describe("buildPacingPrompt", () => {
  it("instructs the agent that project-wide findings (entityId=null) are common", () => {
    const { system } = buildPacingPrompt({
      projectId: "p",
      branchId: "b",
      entities: [],
    });
    expect(system.toLowerCase()).toContain("project-wide");
    expect(system).toMatch(/entityId=null|entityId is null|null/i);
  });
});

describe("runPacingAgent", () => {
  it("returns parsed findings", async () => {
    (generateModelObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: {
        findings: [
          { entityId: null, entityType: null, severity: "info", message: "Act 2 underweight." },
        ],
      },
      usage: { inputTokens: 50, outputTokens: 10 },
      latencyMs: 200,
    });

    const out = await runPacingAgent({ projectId: "p", branchId: "b", entities: [] });
    expect(out.findings[0]!.entityId).toBeNull();
    expect(out.findings[0]!.severity).toBe("info");
    expect(out.model).toBe("claude-sonnet-4-6");
  });
});
