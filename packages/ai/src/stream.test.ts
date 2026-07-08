import { describe, it, expect, vi } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (model: string) => ({
    provider: "anthropic-mock",
    modelId: model,
  }),
}));

const mockStreamText = vi.fn();
vi.mock("ai", () => ({
  streamText: (opts: unknown) => mockStreamText(opts),
}));

import { streamModelTextSSE } from "./stream";

function makeStream<T>(items: T[]) {
  return new ReadableStream<T>({
    start(controller) {
      for (const item of items) controller.enqueue(item);
      controller.close();
    },
  });
}

describe("streamModelTextSSE", () => {
  it("emits text-delta chunks as UTF-8 and resolves done with usage", async () => {
    mockStreamText.mockReturnValueOnce({
      fullStream: makeStream([
        { type: "text-delta", textDelta: "Hello " },
        { type: "text-delta", textDelta: "world" },
        {
          type: "finish",
          usage: { promptTokens: 10, completionTokens: 20 },
        },
      ]),
    });

    const { stream, done } = streamModelTextSSE({
      model: "claude-sonnet-4-6",
      prompt: "ignored — sdk is mocked",
    });

    const decoder = new TextDecoder();
    const reader = stream.getReader();
    let text = "";
    while (true) {
      const { done: end, value } = await reader.read();
      if (end) break;
      text += decoder.decode(value);
    }
    expect(text).toBe("Hello world");

    const result = await done;
    expect(result.text).toBe("Hello world");
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("rejects done if the sdk emits an error part", async () => {
    mockStreamText.mockReturnValueOnce({
      fullStream: makeStream([
        { type: "text-delta", textDelta: "partial" },
        { type: "error", error: new Error("boom") },
      ]),
    });

    const { stream, done } = streamModelTextSSE({
      model: "claude-sonnet-4-6",
      prompt: "x",
    });

    // Consume the stream so the underlying iterator runs.
    const reader = stream.getReader();
    while (true) {
      const { done: end } = await reader.read();
      if (end) break;
    }

    await expect(done).rejects.toThrow("boom");
  });
});
