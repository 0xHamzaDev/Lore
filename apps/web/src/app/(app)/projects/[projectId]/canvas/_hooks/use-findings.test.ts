import { describe, it, expect } from "vitest";
import { deriveSeverityMap, type FindingRow } from "./use-findings";

const row = (over: Partial<FindingRow>): FindingRow => ({
  id: "1",
  entityId: "c1",
  entityType: "character",
  agentType: "continuity",
  severity: "info",
  message: "m",
  status: "open",
  ...over,
});

describe("deriveSeverityMap", () => {
  it("returns the highest severity per entityId (error > warning > info)", () => {
    const map = deriveSeverityMap([
      row({ id: "1", entityId: "c1", severity: "info" }),
      row({ id: "2", entityId: "c1", severity: "warning" }),
      row({ id: "3", entityId: "c1", severity: "error" }),
      row({ id: "4", entityId: "c2", severity: "info" }),
    ]);
    expect(map.get("c1")).toBe("error");
    expect(map.get("c2")).toBe("info");
  });

  it("ignores findings with null entityId (project-wide)", () => {
    const map = deriveSeverityMap([
      row({ id: "1", entityId: null, entityType: null, severity: "error" }),
    ]);
    expect(map.size).toBe(0);
  });
});
