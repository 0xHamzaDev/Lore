import {
  db,
  characters,
  locations,
  factions,
  scenes,
  timelineEvents,
  and,
  eq,
  isNull,
} from "@lore/db";
import type { CompactEntity } from "@lore/validators";

export interface AgentContext {
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}

// Builds the compact entity list the four background agents consume. Mirrors
// loadCompactEntities in apps/web/src/app/api/ai/command/route.ts — duplicated
// rather than promoted to a shared package; promote when a fourth caller
// appears. Soft-deleted rows are excluded. Projection is constrained to the
// CompactEntity schema {id, type, name, hint?} — extra columns from the DB
// rows are intentionally dropped so the model prompt stays small.
export async function buildAgentContext(input: {
  projectId: string;
  branchId: string;
}): Promise<AgentContext> {
  const [chars, locs, facs, scns, tls] = await Promise.all([
    db
      .select()
      .from(characters)
      .where(and(eq(characters.branchId, input.branchId), isNull(characters.deletedAt))),
    db
      .select()
      .from(locations)
      .where(and(eq(locations.branchId, input.branchId), isNull(locations.deletedAt))),
    db
      .select()
      .from(factions)
      .where(and(eq(factions.branchId, input.branchId), isNull(factions.deletedAt))),
    db
      .select()
      .from(scenes)
      .where(and(eq(scenes.branchId, input.branchId), isNull(scenes.deletedAt))),
    db
      .select()
      .from(timelineEvents)
      .where(and(eq(timelineEvents.branchId, input.branchId), isNull(timelineEvents.deletedAt))),
  ]);

  const entities: CompactEntity[] = [
    ...chars.map((c) => ({
      id: c.id,
      type: "character" as const,
      name: c.name,
      ...withHint(c.bio),
    })),
    ...locs.map((l) => ({
      id: l.id,
      type: "location" as const,
      name: l.name,
      ...withHint(l.description),
    })),
    ...facs.map((f) => ({
      id: f.id,
      type: "faction" as const,
      name: f.name,
      ...withHint(f.description),
    })),
    ...scns.map((s) => ({
      id: s.id,
      type: "scene" as const,
      name: s.title,
      ...withHint(s.summary),
    })),
    ...tls.map((t) => ({
      id: t.id,
      type: "timeline_event" as const,
      name: t.title,
      ...withHint(t.description),
    })),
  ];

  return { projectId: input.projectId, branchId: input.branchId, entities };
}

function withHint(s: string | null | undefined): { hint?: string } {
  if (!s) return {};
  const t = s.trim();
  if (t.length === 0) return {};
  return { hint: t.length <= 200 ? t : `${t.slice(0, 197)}...` };
}
