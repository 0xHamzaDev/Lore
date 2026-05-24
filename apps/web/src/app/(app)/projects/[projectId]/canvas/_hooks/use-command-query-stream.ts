"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface StreamState {
  status: "idle" | "streaming" | "done" | "error";
  text: string;
  error?: string;
}

export interface UseCommandQueryStreamArgs {
  projectId: string;
  branchId: string;
  locale: "ar" | "en";
}

export interface UseCommandQueryStreamResult {
  status: StreamState["status"];
  text: string;
  error?: string;
  start: (question: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useCommandQueryStream(
  args: UseCommandQueryStreamArgs,
): UseCommandQueryStreamResult {
  const [state, setState] = useState<StreamState>({ status: "idle", text: "" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    setState({ status: "idle", text: "" });
  }, [stop]);

  const start = useCallback(
    async (question: string) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: "streaming", text: "" });

      let resp: Response;
      try {
        resp = await fetch("/api/ai/command/query", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: args.projectId,
            branchId: args.branchId,
            question,
            locale: args.locale,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "error", text: "", error: message });
        return;
      }

      if (!resp.ok || !resp.body) {
        setState({ status: "error", text: "", error: `request_failed_${resp.status}` });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Parse SSE frames separated by blank lines.
          let nl = buffer.indexOf("\n\n");
          while (nl !== -1) {
            const frame = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 2);
            const event = parseSseFrame(frame);
            if (event?.event === "delta" && typeof event.data?.text === "string") {
              accumulated += event.data.text;
              setState({ status: "streaming", text: accumulated });
            } else if (event?.event === "done") {
              setState({ status: "done", text: accumulated });
            } else if (event?.event === "error") {
              const message =
                typeof event.data?.message === "string" ? event.data.message : "stream_error";
              setState({ status: "error", text: accumulated, error: message });
            }
            nl = buffer.indexOf("\n\n");
          }
        }
        // If the stream ended without an explicit `done` event, treat as done.
        setState((prev) =>
          prev.status === "streaming" ? { status: "done", text: prev.text } : prev,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "error", text: accumulated, error: message });
      }
    },
    [args.projectId, args.branchId, args.locale, stop],
  );

  const result: UseCommandQueryStreamResult = {
    status: state.status,
    text: state.text,
    start,
    stop,
    reset,
  };
  if (state.error !== undefined) result.error = state.error;
  return result;
}

interface SseFrame {
  event: string;
  data: { text?: unknown; message?: unknown } | null;
}

function parseSseFrame(frame: string): SseFrame | null {
  let event = "message";
  let dataLine = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    return { event, data: JSON.parse(dataLine) };
  } catch {
    return null;
  }
}
