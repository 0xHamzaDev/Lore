import { describe, it, expect } from "vitest";
import { ROUTES } from "./routes";

describe("ROUTES.projects.canvas", () => {
  it("returns the canvas path for a given project id", () => {
    expect(ROUTES.projects.canvas("proj_abc123")).toBe("/projects/proj_abc123/canvas");
  });

  it("includes the project id verbatim", () => {
    const id = "proj-with-dashes_and_underscores";
    expect(ROUTES.projects.canvas(id)).toBe(`/projects/${id}/canvas`);
  });
});
