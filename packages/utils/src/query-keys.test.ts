import { describe, it, expect } from "vitest";
import { QK } from "./query-keys";

describe("QK.org.members", () => {
  it("returns a stable key tuple for a given org id", () => {
    expect(QK.org.members("org_123")).toEqual(["org", "org_123", "members"]);
  });

  it("produces different keys for different org ids", () => {
    expect(QK.org.members("org_a")).not.toEqual(QK.org.members("org_b"));
  });
});

describe("QK.org.invitations", () => {
  it("returns a stable key tuple for a given org id", () => {
    expect(QK.org.invitations("org_123")).toEqual(["org", "org_123", "invitations"]);
  });

  it("produces different keys for different org ids", () => {
    expect(QK.org.invitations("org_a")).not.toEqual(QK.org.invitations("org_b"));
  });
});
