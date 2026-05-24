import { describe, it, expect } from "vitest";
import { createNdjsonParser } from "./ndjson";

describe("createNdjsonParser", () => {
  it("parses multiple complete lines from one chunk", () => {
    const p = createNdjsonParser();
    const out = p.push('{"a":1}\n{"b":2}\n');
    expect(out).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("buffers a line split across chunks until its newline arrives", () => {
    const p = createNdjsonParser();
    expect(p.push('{"a":')).toEqual([]);
    expect(p.push("1}\n")).toEqual([{ a: 1 }]);
  });

  it("skips malformed JSON lines but keeps valid ones", () => {
    const p = createNdjsonParser();
    const out = p.push('{"a":1}\nnot json\n{"b":2}\n');
    expect(out).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("skips blank lines and non-object lines (e.g. code fences)", () => {
    const p = createNdjsonParser();
    const out = p.push('```json\n\n{"a":1}\n```\n');
    expect(out).toEqual([{ a: 1 }]);
  });

  it("flush() parses a trailing line with no newline", () => {
    const p = createNdjsonParser();
    expect(p.push('{"a":1}')).toEqual([]);
    expect(p.flush()).toEqual([{ a: 1 }]);
  });

  it("flush() on an empty buffer returns nothing", () => {
    const p = createNdjsonParser();
    p.push('{"a":1}\n');
    expect(p.flush()).toEqual([]);
  });
});
