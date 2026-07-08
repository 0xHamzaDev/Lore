"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FieldGenStatus = "idle" | "streaming" | "done" | "error";

export interface FieldGenMeta {
  aiRunId: string | null;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
  latencyMs?: number;
}

export interface GenerateFieldInput {
  projectId: string;
  entityType: string;
  fieldKey: string;
  fieldLabel?: string;
  context?: Record<string, string>;
  locale?: string;
}

export interface UseFieldGeneration {
  status: FieldGenStatus;
  /** Which field key the current/last generation targets — null when idle. */
  fieldKey: string | null;
  suggestion: string;
  meta: FieldGenMeta | null;
  error: string | null;
  /** True when the backend returned 402 (defense-in-depth; free users are gated client-side). */
  upgradeRequired: boolean;
  start: (input: GenerateFieldInput) => void;
  reset: () => void;
}

// Parse one SSE frame ("event: x\ndata: {...}") into its event name + raw data.
function parseFrame(frame: string): { event: string; data: string } {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    else if (line.startsWith("data:"))
      data += line.slice("data:".length).trim();
  }
  return { event, data };
}

// Drives a single on-demand field generation over the SSE stream from
// /api/ai/generate-field. One generation at a time — calling start() again
// (Regenerate) aborts the in-flight request first.
export function useFieldGeneration(): UseFieldGeneration {
  const [status, setStatus] = useState<FieldGenStatus>("idle");
  const [fieldKey, setFieldKey] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [meta, setMeta] = useState<FieldGenMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setFieldKey(null);
    setSuggestion("");
    setMeta(null);
    setError(null);
    setUpgradeRequired(false);
  }, []);

  const start = useCallback((input: GenerateFieldInput) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setFieldKey(input.fieldKey);
    setSuggestion("");
    setMeta(null);
    setError(null);
    setUpgradeRequired(false);

    void (async () => {
      let res: Response;
      try {
        res = await fetch("/api/ai/generate-field", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "network_error");
        setStatus("error");
        return;
      }

      if (res.status === 402) {
        setUpgradeRequired(true);
        setStatus("error");
        return;
      }
      if (!res.ok || !res.body) {
        setError(`upstream_${res.status}`);
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      const handleFrame = (raw: string) => {
        const { event, data } = parseFrame(raw);
        if (!data) return;
        if (event === "delta") {
          try {
            const { text } = JSON.parse(data) as { text?: string };
            if (text) {
              acc += text;
              setSuggestion(acc);
            }
          } catch {
            // Ignore an unparseable delta frame rather than aborting the stream.
          }
        } else if (event === "done") {
          try {
            const m = JSON.parse(data) as FieldGenMeta;
            setMeta(m);
          } catch {
            setMeta({ aiRunId: null });
          }
          setStatus("done");
        } else if (event === "error") {
          let message = "generation_failed";
          try {
            const e = JSON.parse(data) as { message?: string };
            if (e.message) message = e.message;
          } catch {
            // keep default
          }
          setError(message);
          setStatus("error");
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            handleFrame(buffer.slice(0, idx));
            buffer = buffer.slice(idx + 2);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "stream_error");
        setStatus("error");
        return;
      }

      // Stream closed without an explicit done/error event: if we got text,
      // treat it as complete; otherwise it's an error.
      setStatus((prev) => {
        if (prev !== "streaming") return prev;
        return acc.length > 0 ? "done" : "error";
      });
    })();
  }, []);

  // Abort any in-flight request when the panel unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    status,
    fieldKey,
    suggestion,
    meta,
    error,
    upgradeRequired,
    start,
    reset,
  };
}
