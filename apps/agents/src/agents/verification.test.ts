import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@lore/ai", () => ({
  generateModelObject: vi.fn(),
  MODELS: { sonnet: "claude-sonnet-4-6", opus: "claude-opus-4-7", haiku: "claude-haiku-4-5" },
}));

const searchMock = vi.fn(
  async (_q: string) => [] as Array<{ title: string; url: string; snippet: string }>,
);
vi.mock("../web-search", () => ({ webSearch: searchMock }));

const { runVerificationAgent, buildVerificationPrompt } = await import("./verification");
const { generateModelObject } = await import("@lore/ai");

beforeEach(() => {
  vi.clearAllMocks();
  searchMock.mockReset().mockResolvedValue([]);
});

describe("buildVerificationPrompt", () => {
  it("asks for { query, candidate } pairs", () => {
    const { system } = buildVerificationPrompt({ projectId: "p", branchId: "b", entities: [] });
    expect(system.toLowerCase()).toContain("query");
  });
});

describe("runVerificationAgent", () => {
  it("calls webSearch once per candidate and drops candidates with no results", async () => {
    (generateModelObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: {
        candidates: [
          {
            query: "Damascus founding date",
            finding: {
              entityId: "l1",
              entityType: "location",
              severity: "warning",
              message: "Verify founding date claim.",
            },
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 20 },
      latencyMs: 200,
    });

    const out = await runVerificationAgent({ projectId: "p", branchId: "b", entities: [] });

    expect(searchMock).toHaveBeenCalledWith("Damascus founding date");
    expect(out.findings).toEqual([]); // stub returns [] → candidate dropped
  });

  it("keeps candidates whose webSearch returns at least one result", async () => {
    (generateModelObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: {
        candidates: [
          {
            query: "real city",
            finding: {
              entityId: "l1",
              entityType: "location",
              severity: "warning",
              message: "Cross-check city facts.",
            },
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 20 },
      latencyMs: 200,
    });
    searchMock.mockResolvedValueOnce([{ title: "t", url: "u", snippet: "s" }]);

    const out = await runVerificationAgent({ projectId: "p", branchId: "b", entities: [] });
    expect(out.findings).toHaveLength(1);
  });
});
