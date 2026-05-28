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
  orgId: string;
  projectId: string;
  branchId: string;
  entities: CompactEntity[];
}

// Builds the compact entity list the four background agents consume. Mirrors
// loadCompactEntities in apps/web/src/app/api/ai/command/* (duplicated rather
// than promoted to a shared package; promote when a fourth caller appears).
// Filters by orgId + branchId + soft-delete on every table — orgId is the
// tenant-isolation boundary, never trusted from the client. Projection is
// constrained to the columns the CompactEntity shape needs so we don't waste
// Neon-HTTP bandwidth pulling full rows per agent run.
export async function buildAgentContext(input: {
  orgId: string;
  projectId: string;
  branchId: string;
}): Promise<AgentContext> {
  const [chars, locs, facs, scns, tls] = await Promise.all([
    db
      .select({ id: characters.id, name: characters.name, bio: characters.bio })
      .from(characters)
      .where(
        and(
          eq(characters.orgId, input.orgId),
          eq(characters.branchId, input.branchId),
          isNull(characters.deletedAt),
        ),
      ),
    db
      .select({
        id: locations.id,
        name: locations.name,
        description: locations.description,
      })
      .from(locations)
      .where(
        and(
          eq(locations.orgId, input.orgId),
          eq(locations.branchId, input.branchId),
          isNull(locations.deletedAt),
        ),
      ),
    db
      .select({
        id: factions.id,
        name: factions.name,
        description: factions.description,
      })
      .from(factions)
      .where(
        and(
          eq(factions.orgId, input.orgId),
          eq(factions.branchId, input.branchId),
          isNull(factions.deletedAt),
        ),
      ),
    db
      .select({ id: scenes.id, title: scenes.title, summary: scenes.summary })
      .from(scenes)
      .where(
        and(
          eq(scenes.orgId, input.orgId),
          eq(scenes.branchId, input.branchId),
          isNull(scenes.deletedAt),
        ),
      ),
    db
      .select({
        id: timelineEvents.id,
        title: timelineEvents.title,
        description: timelineEvents.description,
      })
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.orgId, input.orgId),
          eq(timelineEvents.branchId, input.branchId),
          isNull(timelineEvents.deletedAt),
        ),
      ),
  ]);

  const entities: CompactEntity[] = [
    ...chars.map((r) => ({
      id: r.id,
      type: "character" as const,
      name: r.name,
      ...withHint(r.bio),
    })),
    ...locs.map((r) => ({
      id: r.id,
      type: "location" as const,
      name: r.name,
      ...withHint(r.description),
    })),
    ...facs.map((r) => ({
      id: r.id,
      type: "faction" as const,
      name: r.name,
      ...withHint(r.description),
    })),
    ...scns.map((r) => ({
      id: r.id,
      type: "scene" as const,
      name: r.title,
      ...withHint(r.summary),
    })),
    ...tls.map((r) => ({
      id: r.id,
      type: "timeline_event" as const,
      name: r.title,
      ...withHint(r.description),
    })),
  ];

  return {
    orgId: input.orgId,
    projectId: input.projectId,
    branchId: input.branchId,
    entities,
  };
}

function withHint(s: string | null | undefined): { hint?: string } {
  if (!s) return {};
  const t = s.trim();
  if (t.length === 0) return {};
  return { hint: t.length <= 200 ? t : `${t.slice(0, 197)}...` };
}
