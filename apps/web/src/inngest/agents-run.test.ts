import { describe, it, expect, vi, beforeEach } from "vitest";

const callMock = vi.fn(
  async (): Promise<{ success: boolean; error?: string }> => ({
    success: true,
  }),
);
const subMock = vi.fn();

vi.mock("@lore/auth/subscription", () => ({ requireSubscription: subMock }));
vi.mock("@/lib/inngest/call-agents-background", () => ({
  callAgentsBackground: callMock,
}));

const { runBackgroundAgents, _handler } = await import("./agents-run");

beforeEach(() => {
  vi.clearAllMocks();
  subMock.mockResolvedValue({ allowed: true, plan: "pro" });
});

describe("runBackgroundAgents", () => {
  it("is registered as an InngestFunction (smoke)", () => {
    // Inngest's createFunction returns an InngestFunction instance. We avoid
    // asserting against private internals (.opts, .trigger) because those
    // aren't part of Inngest's stable public surface. The behavior tests
    // below cover the runtime contract via _handler.
    expect(runBackgroundAgents).toBeDefined();
    expect(typeof runBackgroundAgents).toBe("object");
  });
});

describe("_handler (extracted for unit testing)", () => {
  const baseEvent = {
    data: { orgId: "o1", projectId: "p1", branchId: "b1" },
  };

  it("returns { skipped: 'free_plan' } for free orgs and does NOT call agents", async () => {
    subMock.mockResolvedValue({ allowed: false, plan: "free" });
    const step = { run: vi.fn(async (_n: string, fn: () => Promise<unknown>) => fn()) };

    const out = await _handler({ event: baseEvent as never, step: step as never });

    expect(out).toEqual({ skipped: "free_plan" });
    expect(callMock).not.toHaveBeenCalled();
  });

  it("calls agents background for paid orgs", async () => {
    subMock.mockResolvedValue({ allowed: true, plan: "pro" });
    const step = { run: vi.fn(async (_n: string, fn: () => Promise<unknown>) => fn()) };

    await _handler({ event: baseEvent as never, step: step as never });

    expect(callMock).toHaveBeenCalledWith({ orgId: "o1", projectId: "p1", branchId: "b1" });
  });

  it("throws when the gateway call fails so Inngest retries the step", async () => {
    subMock.mockResolvedValue({ allowed: true, plan: "pro" });
    callMock.mockResolvedValueOnce({ success: false, error: "gateway 500: boom" });
    const step = { run: vi.fn(async (_n: string, fn: () => Promise<unknown>) => fn()) };

    await expect(
      _handler({
        event: { data: { orgId: "o1", projectId: "p1", branchId: "b1" } } as never,
        step: step as never,
      }),
    ).rejects.toThrow(/gateway 500: boom|agents background call failed/);
  });
});
