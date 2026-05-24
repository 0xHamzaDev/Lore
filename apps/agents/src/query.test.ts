import { describe, it, expect } from "vitest";
import { buildQueryPrompt } from "./query";

describe("buildQueryPrompt", () => {
  it("places the question verbatim in the prompt", () => {
    const { prompt } = buildQueryPrompt({
      question: "How many characters are there?",
      entities: [],
      locale: "en",
    });
    expect(prompt).toContain("How many characters are there?");
  });

  it("includes the entity list as JSON", () => {
    const { prompt } = buildQueryPrompt({
      question: "q",
      entities: [{ id: "c1", type: "character", name: "Ahmad" }],
      locale: "en",
    });
    expect(prompt).toContain('"name":"Ahmad"');
  });

  it("instructs the model to answer in Arabic for locale=ar", () => {
    const { system } = buildQueryPrompt({ question: "q", entities: [], locale: "ar" });
    expect(system).toContain("Arabic");
  });

  it("instructs the model to admit when the answer is not in the entities", () => {
    const { system } = buildQueryPrompt({ question: "q", entities: [], locale: "en" });
    expect(system.toLowerCase()).toContain("not in the entities");
  });
});
