import { describe, it, expect } from "vitest";
import { commandIntentSchema, compactEntitySchema } from "./command";

describe("commandIntentSchema", () => {
  it("parses a create intent with one rich character", () => {
    const out = commandIntentSchema.safeParse({
      intent: "create",
      entities: [
        {
          entityType: "character",
          data: {
            name: "Ahmad",
            bio: "A detective in Riyadh.",
            role: "detective",
          },
        },
      ],
    });
    expect(out.success).toBe(true);
  });

  it("rejects a create intent with zero entities", () => {
    const out = commandIntentSchema.safeParse({
      intent: "create",
      entities: [],
    });
    expect(out.success).toBe(false);
  });

  it("parses a non-destructive edit with one patch op", () => {
    const out = commandIntentSchema.safeParse({
      intent: "edit",
      destructive: false,
      summary: "Update Ahmad's backstory",
      operations: [
        {
          op: "patch",
          entityId: "abc123",
          entityType: "character",
          field: "backstory",
          suggestedValue: "Lost his family young.",
        },
      ],
    });
    expect(out.success).toBe(true);
  });

  it("parses a destructive edit with delete ops", () => {
    const out = commandIntentSchema.safeParse({
      intent: "edit",
      destructive: true,
      summary: "Delete 2 scenes",
      operations: [
        { op: "delete", entityId: "s1", entityType: "scene", name: "Scene 1" },
        { op: "delete", entityId: "s2", entityType: "scene", name: "Scene 2" },
      ],
    });
    expect(out.success).toBe(true);
  });

  it("rejects an edit op with an unknown op discriminator", () => {
    const out = commandIntentSchema.safeParse({
      intent: "edit",
      destructive: false,
      summary: "x",
      operations: [
        { op: "rename", entityId: "x", entityType: "character", to: "y" },
      ],
    });
    expect(out.success).toBe(false);
  });

  it("parses a query intent (payload-less)", () => {
    expect(commandIntentSchema.safeParse({ intent: "query" }).success).toBe(
      true,
    );
  });

  it("parses an agent_trigger intent", () => {
    const out = commandIntentSchema.safeParse({
      intent: "agent_trigger",
      scope: "all scenes",
      message: "Continuity check queued.",
    });
    expect(out.success).toBe(true);
  });

  it("parses an unknown intent with a graceful message", () => {
    const out = commandIntentSchema.safeParse({
      intent: "unknown",
      message: "I'm not sure how to help with that.",
    });
    expect(out.success).toBe(true);
  });

  it("rejects an entityType that doesn't exist", () => {
    const out = commandIntentSchema.safeParse({
      intent: "edit",
      destructive: false,
      summary: "x",
      operations: [
        {
          op: "patch",
          entityId: "x",
          entityType: "weapon",
          field: "f",
          suggestedValue: "v",
        },
      ],
    });
    expect(out.success).toBe(false);
  });
});

describe("compactEntitySchema", () => {
  it("parses a minimal compact entity", () => {
    const out = compactEntitySchema.safeParse({
      id: "abc",
      type: "character",
      name: "Ahmad",
    });
    expect(out.success).toBe(true);
  });

  it("parses with an optional hint", () => {
    const out = compactEntitySchema.safeParse({
      id: "abc",
      type: "location",
      name: "Riyadh",
      hint: "Capital city.",
    });
    expect(out.success).toBe(true);
  });
});
