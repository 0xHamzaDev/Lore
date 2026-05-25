import { describe, it, expect } from "vitest";
import { agentFindingSchema, agentFindingsPayloadSchema } from "./agent-finding";

describe("agentFindingSchema", () => {
  it("parses a per-entity finding", () => {
    const out = agentFindingSchema.safeParse({
      entityId: "c1",
      entityType: "character",
      severity: "error",
      message: "Born 1850 but fought in the 1820 war.",
    });
    expect(out.success).toBe(true);
  });

  it("parses a project-wide finding (null entity)", () => {
    const out = agentFindingSchema.safeParse({
      entityId: null,
      entityType: null,
      severity: "info",
      message: "Act 2 is underrepresented relative to acts 1 and 3.",
    });
    expect(out.success).toBe(true);
  });

  it("rejects an unknown severity", () => {
    const out = agentFindingSchema.safeParse({
      entityId: "c1",
      entityType: "character",
      severity: "critical",
      message: "anything goes here.",
    });
    expect(out.success).toBe(false);
  });

  it("rejects a message shorter than 8 chars", () => {
    const out = agentFindingSchema.safeParse({
      entityId: "c1",
      entityType: "character",
      severity: "info",
      message: "short",
    });
    expect(out.success).toBe(false);
  });

  it("accepts a message at the lower bound (8 chars)", () => {
    const out = agentFindingSchema.safeParse({
      entityId: "c1",
      entityType: "character",
      severity: "info",
      message: "12345678",
    });
    expect(out.success).toBe(true);
  });

  it("rejects a message above the upper bound (401 chars)", () => {
    const out = agentFindingSchema.safeParse({
      entityId: "c1",
      entityType: "character",
      severity: "info",
      message: "x".repeat(401),
    });
    expect(out.success).toBe(false);
  });
});

describe("agentFindingsPayloadSchema", () => {
  it("parses an empty findings list", () => {
    const out = agentFindingsPayloadSchema.safeParse({ findings: [] });
    expect(out.success).toBe(true);
  });

  it("rejects a list of 51 findings", () => {
    const findings = Array.from({ length: 51 }, () => ({
      entityId: "c1",
      entityType: "character" as const,
      severity: "info" as const,
      message: "ok message length",
    }));
    const out = agentFindingsPayloadSchema.safeParse({ findings });
    expect(out.success).toBe(false);
  });

  it("accepts exactly 50 findings (upper boundary)", () => {
    const findings = Array.from({ length: 50 }, () => ({
      entityId: "c1",
      entityType: "character" as const,
      severity: "info" as const,
      message: "ok message length",
    }));
    const out = agentFindingsPayloadSchema.safeParse({ findings });
    expect(out.success).toBe(true);
  });

  it("rejects a payload whose finding is itself invalid", () => {
    const out = agentFindingsPayloadSchema.safeParse({
      findings: [
        {
          entityId: "c1",
          entityType: "character",
          severity: "not-a-real-severity",
          message: "ok message length",
        },
      ],
    });
    expect(out.success).toBe(false);
  });
});
