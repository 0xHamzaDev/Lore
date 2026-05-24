import { describe, it, expect } from "vitest";
import { wizardEntitySchema } from "./wizard";

describe("wizardEntitySchema", () => {
  it("accepts a full character", () => {
    const r = wizardEntitySchema.safeParse({
      entityType: "character",
      data: {
        name: "Ahmad",
        bio: "A weary detective.",
        age: "40",
        role: "Detective",
        backstory: "Lost his partner.",
        voiceSample: "We do this by the book.",
      },
    });
    expect(r.success).toBe(true);
  });

  it("accepts a minimal character (name only)", () => {
    const r = wizardEntitySchema.safeParse({ entityType: "character", data: { name: "Layla" } });
    expect(r.success).toBe(true);
  });

  it("strips unknown keys in data rather than rejecting", () => {
    const r = wizardEntitySchema.safeParse({
      entityType: "location",
      data: { name: "Riyadh", description: "A sprawling capital.", bogus: "drop me" },
    });
    expect(r.success).toBe(true);
    if (r.success) expect("bogus" in r.data.data).toBe(false);
  });

  it("rejects a missing required name", () => {
    expect(wizardEntitySchema.safeParse({ entityType: "character", data: {} }).success).toBe(false);
  });

  it("rejects an unknown entityType", () => {
    expect(
      wizardEntitySchema.safeParse({ entityType: "spaceship", data: { name: "X" } }).success,
    ).toBe(false);
  });

  it("uses title (not name) for scene and timeline_event", () => {
    expect(
      wizardEntitySchema.safeParse({ entityType: "scene", data: { title: "Opening" } }).success,
    ).toBe(true);
    expect(
      wizardEntitySchema.safeParse({ entityType: "scene", data: { name: "Opening" } }).success,
    ).toBe(false);
    expect(
      wizardEntitySchema.safeParse({ entityType: "timeline_event", data: { title: "The Fall" } })
        .success,
    ).toBe(true);
  });

  it("coerces sceneOrder and rejects absurdly long fields", () => {
    const ok = wizardEntitySchema.safeParse({
      entityType: "scene",
      data: { title: "S1", sceneOrder: 3 },
    });
    expect(ok.success).toBe(true);
    const tooLong = wizardEntitySchema.safeParse({
      entityType: "character",
      data: { name: "X", backstory: "a".repeat(7000) },
    });
    expect(tooLong.success).toBe(false);
  });
});
