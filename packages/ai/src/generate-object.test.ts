import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (m: string) => ({ modelId: m }),
}));

import { generateObject } from "ai";
import { generateModelObject } from "./generate-object";

const generateObjectMock = generateObject as unknown as ReturnType<
  typeof vi.fn
>;

describe("generateModelObject", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it("returns object + usage + latencyMs + model on happy path", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { greeting: "hi" },
      usage: { promptTokens: 10, completionTokens: 5 },
    });
    const schema = z.object({ greeting: z.string() });
    const result = await generateModelObject({
      model: "claude-test",
      schema,
      prompt: "say hi",
    });
    expect(result.object).toEqual({ greeting: "hi" });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(typeof result.latencyMs).toBe("number");
    expect(result.model).toBe("claude-test");
  });

  it("forwards system, prompt, schema, and maxTokens to the SDK", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { ok: true },
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const schema = z.object({ ok: z.literal(true) });
    await generateModelObject({
      model: "m",
      schema,
      system: "S",
      prompt: "P",
      maxTokens: 100,
    });
    const call = generateObjectMock.mock.calls[0]?.[0];
    expect(call?.system).toBe("S");
    expect(call?.prompt).toBe("P");
    expect(call?.maxTokens).toBe(100);
    expect(call?.schema).toBe(schema);
  });

  it("defaults maxTokens and timeout when omitted", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {},
      usage: { promptTokens: 0, completionTokens: 0 },
    });
    await generateModelObject({
      model: "m",
      schema: z.object({}),
      prompt: "p",
    });
    const call = generateObjectMock.mock.calls[0]?.[0];
    expect(call?.maxTokens).toBe(1024);
    expect(call?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("treats missing usage fields as zero", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {},
      usage: {},
    });
    const result = await generateModelObject({
      model: "m",
      schema: z.object({}),
      prompt: "p",
    });
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("rethrows SDK errors", async () => {
    generateObjectMock.mockRejectedValueOnce(new Error("model error"));
    await expect(
      generateModelObject({ model: "m", schema: z.object({}), prompt: "p" }),
    ).rejects.toThrow("model error");
  });
});
