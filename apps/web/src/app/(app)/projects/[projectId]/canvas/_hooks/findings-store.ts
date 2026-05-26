import { useSyncExternalStore } from "react";

type Severity = "error" | "warning" | "info";

// Module-level store bridging the React-Query findings poll (which lives in the
// canvas component tree) to the tldraw shape components (which render outside
// that tree, so React context won't reach them). useFindings publishes the
// severity map here; each shape subscribes to just its own entityId.
let severityMap = new Map<string, Severity>();
const listeners = new Set<() => void>();

export function publishSeverityMap(next: Map<string, Severity>): void {
  severityMap = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Subscribe a single shape to its entity's severity. Returns null when clean.
export function useShapeSeverity(entityId: string): Severity | null {
  return useSyncExternalStore(
    subscribe,
    () => severityMap.get(entityId) ?? null,
    () => null, // server snapshot
  );
}
