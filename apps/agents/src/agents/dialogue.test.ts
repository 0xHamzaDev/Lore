import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/ai", () => ({
  generateModelObject: vi.fn(),
  MODELS: { sonnet: "claude-sonnet-4-6", opus: "claude-opus-4-7", haiku: "claude-haiku-4-5" },
}));

const { runDialogueAgent, buildDialoguePrompt } = await import("./dialogue");
const { generateModelObject } = await import("@lore/ai");

beforeEach(() => vi.clearAllMocks());

describe("buildDialoguePrompt", () => {
  it("references voiceSample as the per-character voice anchor", () => {
    const { system } = buildDialoguePrompt({ projectId: "p", branchId: "b", entities: [] });
    expect(system).toMatch(/voiceSample|voice sample/i);
  });
});

describe("runDialogueAgent", () => {
  it("returns parsed findings", async () => {
    (generateModelObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: {
        findings: [
          {
            entityId: "c1",
            entityType: "character",
            severity: "warning",
            message: "Voice drifts in scene 3.",
          },
        ],
      },
      usage: { inputTokens: 70, outputTokens: 15 },
      latencyMs: 180,
    });

    const out = await runDialogueAgent({ projectId: "p", branchId: "b", entities: [] });
    expect(out.findings[0]!.entityType).toBe("character");
    expect(out.findings[0]!.severity).toBe("warning");
  });
});
