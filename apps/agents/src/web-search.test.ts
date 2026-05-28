import { describe, it, expect } from "vitest";
import { webSearch, type WebSearchResult } from "./web-search";

describe("webSearch (stub)", () => {
  it("returns an empty array for any query", async () => {
    const out: WebSearchResult[] = await webSearch("Damascus founding date");
    expect(out).toEqual([]);
  });

  it("never throws on empty input", async () => {
    await expect(webSearch("")).resolves.toEqual([]);
  });
});
