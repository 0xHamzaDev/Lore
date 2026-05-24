import { describe, it, expect } from "vitest";
import { buildCommandRouterPrompt } from "./command";

describe("buildCommandRouterPrompt", () => {
  it("includes the user instruction verbatim", () => {
    const { prompt } = buildCommandRouterPrompt({
      instruction: "Add a detective named Ahmad",
      entities: [],
      locale: "en",
    });
    expect(prompt).toContain("Add a detective named Ahmad");
  });

  it("serializes the entity list as JSON inside the prompt", () => {
    const { prompt } = buildCommandRouterPrompt({
      instruction: "edit Ahmad",
      entities: [{ id: "c1", type: "character", name: "Ahmad", hint: "detective" }],
      locale: "en",
    });
    expect(prompt).toContain('"id":"c1"');
    expect(prompt).toContain('"name":"Ahmad"');
  });

  it("switches the create-language directive when locale=ar", () => {
    const { system } = buildCommandRouterPrompt({
      instruction: "x",
      entities: [],
      locale: "ar",
    });
    expect(system).toContain("Arabic");
  });

  it("defaults to English when locale is omitted", () => {
    const { system } = buildCommandRouterPrompt({
      instruction: "x",
      entities: [],
    });
    expect(system).toContain("English");
  });

  it("names all five intents in the system prompt", () => {
    const { system } = buildCommandRouterPrompt({
      instruction: "x",
      entities: [],
      locale: "en",
    });
    for (const intent of ["create", "edit", "query", "agent_trigger", "unknown"]) {
      expect(system).toContain(intent);
    }
  });
});
