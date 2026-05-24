// Incremental NDJSON parser for streamed model output. push() returns the
// objects from any newly-completed lines; a partial trailing line stays buffered
// until its newline arrives. Malformed/empty/non-object lines are skipped (never
// throws) so one bad line can't abort a whole stream. flush() parses whatever
// remains after the stream closes (a final line with no trailing newline).
export interface NdjsonParser {
  push(chunk: string): unknown[];
  flush(): unknown[];
}

function parseLine(line: string): unknown[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  // Drop markdown fences / stray prose the model might emit despite the NDJSON
  // instruction — anything that isn't a JSON object start is ignored.
  if (trimmed[0] !== "{") return [];
  try {
    return [JSON.parse(trimmed)];
  } catch {
    return [];
  }
}

export function createNdjsonParser(): NdjsonParser {
  let buffer = "";
  return {
    push(chunk: string): unknown[] {
      buffer += chunk;
      const out: unknown[] = [];
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        out.push(...parseLine(line));
      }
      return out;
    },
    flush(): unknown[] {
      const rest = buffer;
      buffer = "";
      return parseLine(rest);
    },
  };
}
