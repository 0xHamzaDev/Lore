"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { QK } from "@lore/utils";
import { publishSeverityMap } from "./findings-store";

export interface FindingRow {
  id: string;
  entityId: string | null;
  entityType: "character" | "location" | "faction" | "scene" | "timeline_event" | null;
  agentType: "continuity" | "pacing" | "dialogue" | "verification";
  severity: "error" | "warning" | "info";
  message: string;
  status: "open" | "resolved" | "dismissed";
}

export interface FindingsResponse {
  findings: FindingRow[];
  runStatus: { startedAt: string; completedAt: string | null } | null;
  freeTeaser?: boolean;
}

export type Severity = FindingRow["severity"];

const RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

// Highest severity per entityId. Project-wide findings (entityId=null) are not
// represented — they show only in the sidebar list, never as a shape dot.
export function deriveSeverityMap(rows: FindingRow[]): Map<string, Severity> {
  const out = new Map<string, Severity>();
  for (const r of rows) {
    if (!r.entityId) continue;
    const prev = out.get(r.entityId);
    if (!prev || RANK[r.severity] > RANK[prev]) out.set(r.entityId, r.severity);
  }
  return out;
}

export function useFindings(projectId: string, branchId: string) {
  const query = useQuery({
    queryKey: QK.findings.list(projectId, branchId),
    queryFn: async (): Promise<FindingsResponse> => {
      const res = await fetch(
        `/api/findings?projectId=${encodeURIComponent(projectId)}&branchId=${encodeURIComponent(branchId)}`,
      );
      if (!res.ok) throw new Error(`findings ${res.status}`);
      return res.json();
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const severityMap = useMemo(
    () => deriveSeverityMap(query.data?.findings ?? []),
    [query.data?.findings],
  );

  // Bridge the severity map to the tldraw shape components, which render outside
  // this component tree (so React context won't reach them).
  useEffect(() => {
    publishSeverityMap(severityMap);
  }, [severityMap]);

  return { ...query, severityMap };
}
