import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class strings into one", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("resolves Tailwind conflicts — last value wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("drops falsy values", () => {
    expect(cn("flex", false, undefined, null, "gap-2")).toBe("flex gap-2");
    expect(cn(false, undefined)).toBe("");
  });

  it("accepts conditional object syntax", () => {
    expect(cn("flex", { "font-bold": true, "font-normal": false })).toBe("flex font-bold");
    expect(cn({ hidden: false, block: true })).toBe("block");
  });
});
