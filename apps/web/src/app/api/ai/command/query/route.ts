import { headers } from "next/headers";
import { z } from "zod";
import { signGatewayToken } from "@lore/utils";
import { auth } from "@lore/auth";
import type { CompactEntity } from "@lore/validators";
import {
  db,
  characters,
  locations,
  factions,
  scenes,
  timelineEvents,
  projects,
  members,
  and,
  eq,
  isNull,
} from "@lore/db";
import { env } from "@/env";

export const dynamic = "force-dynamic";

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
    return sseErrorFrame("unauthenticated");
  }
  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    return sseErrorFrame("no_active_org");
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
    return sseErrorFrame("project_not_accessible");
  }
  const [membership] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)));
  if (!membership) {
    return sseErrorFrame("project_not_accessible");
  }

  const entities = await loadCompactEntities(orgId, branchId);
  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 60);
  const payload = { question, entities, locale: locale ?? "en", orgId, projectId };

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_GATEWAY_URL}/agent/query`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sseErrorFrame(`gateway unreachable: ${message}`);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return sseErrorFrame(text || `upstream ${upstream.status}`);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
  });
}

function sseErrorFrame(message: string): Response {
  const frame = `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
  return new Response(frame, {
    status: 200,
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform" },
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
      .select({ id: locations.id, name: locations.name, description: locations.description })
      .from(locations)
      .where(
        and(
          eq(locations.orgId, orgId),
          eq(locations.branchId, branchId),
          isNull(locations.deletedAt),
        ),
      ),
    db
      .select({ id: factions.id, name: factions.name, description: factions.description })
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
    out.push({ id: r.id, type: "location", name: r.name, ...withHint(r.description) });
  }
  for (const r of facs) {
    out.push({ id: r.id, type: "faction", name: r.name, ...withHint(r.description) });
  }
  for (const r of scns) {
    out.push({ id: r.id, type: "scene", name: r.title, ...withHint(r.summary) });
  }
  for (const r of tls) {
    out.push({ id: r.id, type: "timeline_event", name: r.title, ...withHint(r.description) });
  }
  return out;
}

function withHint(s: string | null | undefined): { hint?: string } {
  if (!s) return {};
  const t = s.trim();
  if (t.length === 0) return {};
  return { hint: t.length <= 200 ? t : `${t.slice(0, 197)}...` };
}
