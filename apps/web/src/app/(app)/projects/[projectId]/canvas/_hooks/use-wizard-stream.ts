"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WizardEntity } from "@lore/validators";

export type WizardStreamStatus = "idle" | "streaming" | "done" | "error";

export interface WizardStreamMeta {
  count: number;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
  latencyMs?: number;
}

export interface StartWizardInput {
  projectId: string;
  brief: string;
  locale: "ar" | "en";
  // Persists one entity + places its shape. Returns true if it was persisted, so
  // the hook's success count (used for rollback) only counts real DB writes.
  onEntity: (entity: WizardEntity) => Promise<boolean>;
}

export interface UseWizardStream {
  status: WizardStreamStatus;
  /** Number of entities successfully persisted so far. */
  count: number;
  meta: WizardStreamMeta | null;
  error: string | null;
  /** True when the backend returned 402 (defense in depth). */
  upgradeRequired: boolean;
  start: (input: StartWizardInput) => void;
  reset: () => void;
}

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

export function useWizardStream(): UseWizardStream {
  const [status, setStatus] = useState<WizardStreamStatus>("idle");
  const [count, setCount] = useState(0);
  const [meta, setMeta] = useState<WizardStreamMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const countRef = useRef(0);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    countRef.current = 0;
    setStatus("idle");
    setCount(0);
    setMeta(null);
    setError(null);
    setUpgradeRequired(false);
  }, []);

  const start = useCallback((input: StartWizardInput) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    countRef.current = 0;
    setStatus("streaming");
    setCount(0);
    setMeta(null);
    setError(null);
    setUpgradeRequired(false);

    void (async () => {
      let res: Response;
      try {
        res = await fetch("/api/ai/wizard", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: input.projectId,
            brief: input.brief,
            locale: input.locale,
          }),
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

      const handleFrame = async (raw: string) => {
        const { event, data } = parseFrame(raw);
        if (!data) return;
        if (event === "entity_created") {
          try {
            const entity = JSON.parse(data) as WizardEntity;
            const persisted = await input.onEntity(entity);
            if (persisted) {
              countRef.current += 1;
              setCount(countRef.current);
            }
          } catch {
            // Ignore an unparseable/failed entity rather than aborting the stream.
          }
        } else if (event === "wizard_complete") {
          try {
            const m = JSON.parse(data) as WizardStreamMeta;
            setMeta(m);
          } catch {
            setMeta({ count: countRef.current });
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
            await handleFrame(buffer.slice(0, idx));
            buffer = buffer.slice(idx + 2);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "stream_error");
        setStatus("error");
        return;
      }

      // Stream closed without explicit completion: if we created anything, treat
      // as done; otherwise it's an error.
      setStatus((prev) => {
        if (prev !== "streaming") return prev;
        return countRef.current > 0 ? "done" : "error";
      });
    })();
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, count, meta, error, upgradeRequired, start, reset };
}
