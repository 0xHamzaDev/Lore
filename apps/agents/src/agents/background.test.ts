import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the 4 agents + context loader + upsert + logger.
const continuityMock = vi.fn();
const pacingMock = vi.fn();
const dialogueMock = vi.fn();
const verificationMock = vi.fn();
const upsertMock = vi.fn(async () => undefined);
const logMock = vi.fn(async () => "run_id");
const contextMock = vi.fn(async () => ({
  orgId: "o1",
  projectId: "p1",
  branchId: "b1",
  entities: [],
}));

vi.mock("./context", () => ({ buildAgentContext: contextMock }));
vi.mock("./continuity", () => ({ runContinuityAgent: continuityMock }));
vi.mock("./pacing", () => ({ runPacingAgent: pacingMock }));
vi.mock("./dialogue", () => ({ runDialogueAgent: dialogueMock }));
vi.mock("./verification", () => ({ runVerificationAgent: verificationMock }));
vi.mock("./upsert", () => ({ upsertFindings: upsertMock }));
vi.mock("../logger", () => ({ logAiRun: logMock }));

const { runBackgroundAgents } = await import("./background");

const okResult = (suffix: string) => ({
  findings: [
    {
      entityId: "c1",
      entityType: "character" as const,
      severity: "info" as const,
      message: `finding-${suffix}`,
    },
  ],
  usage: { inputTokens: 10, outputTokens: 5 },
  latencyMs: 100,
  model: "claude-sonnet-4-6",
});

beforeEach(() => {
  vi.clearAllMocks();
  continuityMock.mockResolvedValue(okResult("c"));
  pacingMock.mockResolvedValue(okResult("p"));
  dialogueMock.mockResolvedValue(okResult("d"));
  verificationMock.mockResolvedValue(okResult("v"));
});

describe("runBackgroundAgents", () => {
  it("runs all 4 agents, writes 4 ai_runs rows, and upserts each", async () => {
    const out = await runBackgroundAgents({ orgId: "o1", projectId: "p1", branchId: "b1" });

    expect(continuityMock).toHaveBeenCalledTimes(1);
    expect(pacingMock).toHaveBeenCalledTimes(1);
    expect(dialogueMock).toHaveBeenCalledTimes(1);
    expect(verificationMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledTimes(4);
    expect(logMock).toHaveBeenCalledTimes(4);
    expect(out.results).toHaveLength(4);
    expect(out.results.every((r) => r.status === "success")).toBe(true);
  });

  it("isolates a failing agent so the other three still complete and log", async () => {
    pacingMock.mockRejectedValueOnce(new Error("pacing broke"));

    const out = await runBackgroundAgents({ orgId: "o1", projectId: "p1", branchId: "b1" });

    // upsert called only for the 3 successes.
    expect(upsertMock).toHaveBeenCalledTimes(3);
    // logAiRun called for all 4 (1 error row + 3 success rows).
    expect(logMock).toHaveBeenCalledTimes(4);
    const statuses = (logMock.mock.calls as unknown as Array<[{ status: string }]>).map(
      (c) => c[0].status,
    );
    expect(statuses.filter((s) => s === "error")).toHaveLength(1);
    expect(statuses.filter((s) => s === "success")).toHaveLength(3);
    const summary = out.results.find((r) => r.agent === "pacing");
    expect(summary?.status).toBe("error");
  });
});
