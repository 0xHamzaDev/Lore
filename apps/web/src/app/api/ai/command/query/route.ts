import { runQueryStream } from "@lore/agents";
import { auth } from "@lore/auth";
import {
  and,
  characters,
  db,
  eq,
  factions,
  isNull,
  locations,
  members,
  projects,
  scenes,
  timelineEvents,
} from "@lore/db";
import type { CompactEntity } from "@lore/validators";
import { headers } from "next/headers";
import { z } from "zod";
import { createDeltaSseResponse, sseErrorResponse } from "@/lib/agent-sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1),
  branchId: z.string().min(1),
  question: z.string().trim().min(1).max(2000),
  locale: z.enum(["ar", "en"]).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return sseErrorResponse("unauthenticated");
  }
  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    return sseErrorResponse("no_active_org");
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { projectId, branchId, question, locale } = parsed.data;

  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project || project.orgId !== orgId) {
    return sseErrorResponse("project_not_accessible");
  }
  const [membership] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)));
  if (!membership) {
    return sseErrorResponse("project_not_accessible");
  }

  const entities = await loadCompactEntities(orgId, branchId);
  const payload = {
    question,
    entities,
    locale: locale ?? "en",
    orgId,
    projectId,
  };

  let result: ReturnType<typeof runQueryStream>;
  try {
    result = runQueryStream(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sseErrorResponse(message);
  }

  return createDeltaSseResponse(result, {
    orgId,
    projectId,
    runType: "query",
    includeAiRunId: false,
  });
}

async function loadCompactEntities(orgId: string, branchId: string): Promise<CompactEntity[]> {
  const [chars, locs, facs, scns, tls] = await Promise.all([
    db
      .select({ id: characters.id, name: characters.name, bio: characters.bio })
      .from(characters)
      .where(
        and(
          eq(characters.orgId, orgId),
          eq(characters.branchId, branchId),
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
          eq(locations.orgId, orgId),
          eq(locations.branchId, branchId),
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
        and(eq(factions.orgId, orgId), eq(factions.branchId, branchId), isNull(factions.deletedAt)),
      ),
    db
      .select({ id: scenes.id, title: scenes.title, summary: scenes.summary })
      .from(scenes)
      .where(and(eq(scenes.orgId, orgId), eq(scenes.branchId, branchId), isNull(scenes.deletedAt))),
    db
      .select({
        id: timelineEvents.id,
        title: timelineEvents.title,
        description: timelineEvents.description,
      })
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.orgId, orgId),
          eq(timelineEvents.branchId, branchId),
          isNull(timelineEvents.deletedAt),
        ),
      ),
  ]);

  const out: CompactEntity[] = [];
  for (const r of chars) {
    out.push({ id: r.id, type: "character", name: r.name, ...withHint(r.bio) });
  }
  for (const r of locs) {
    out.push({
      id: r.id,
      type: "location",
      name: r.name,
      ...withHint(r.description),
    });
  }
  for (const r of facs) {
    out.push({
      id: r.id,
      type: "faction",
      name: r.name,
      ...withHint(r.description),
    });
  }
  for (const r of scns) {
    out.push({
      id: r.id,
      type: "scene",
      name: r.title,
      ...withHint(r.summary),
    });
  }
  for (const r of tls) {
    out.push({
      id: r.id,
      type: "timeline_event",
      name: r.title,
      ...withHint(r.description),
    });
  }
  return out;
}

function withHint(s: string | null | undefined): { hint?: string } {
  if (!s) return {};
  const t = s.trim();
  if (t.length === 0) return {};
  return { hint: t.length <= 200 ? t : `${t.slice(0, 197)}...` };
}
