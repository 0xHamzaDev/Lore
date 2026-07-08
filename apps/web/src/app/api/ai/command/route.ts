import { headers } from "next/headers";
import { z } from "zod";
import { signGatewayToken } from "@lore/utils";
import { auth } from "@lore/auth";
import { requireSubscription } from "@lore/auth/subscription";
import {
  commandIntentSchema,
  type CommandIntent,
  type CompactEntity,
} from "@lore/validators";
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
  instruction: z.string().trim().min(1).max(2000),
  locale: z.enum(["ar", "en"]).optional(),
});

const PRO_GATED_INTENTS = new Set(["create", "edit", "agent_trigger"]);

export async function POST(req: Request): Promise<Response> {
  // 1) Auth + active org. Classification runs free, so no requirePro here.
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    return Response.json({ error: "no_active_org" }, { status: 400 });
  }

  // 2) Validate input.
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { projectId, branchId, instruction, locale } = parsed.data;

  // 3) Project access: user must be a member of the project's org.
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project || project.orgId !== orgId) {
    return Response.json({ error: "project_not_accessible" }, { status: 403 });
  }
  const [membership] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, userId)));
  if (!membership) {
    return Response.json({ error: "project_not_accessible" }, { status: 403 });
  }

  // 4) Load the branch's entities → compact list. Keep it small so large
  //    branches still fit in one prompt.
  const compact = await loadCompactEntities(orgId, branchId);

  // 5) Sign gateway token, forward to Hono buffered route.
  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 60);
  const payload = {
    instruction,
    entities: compact,
    locale: locale ?? "en",
    orgId,
    projectId,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_GATEWAY_URL}/agent/command`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "unreachable", message }, { status: 502 });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return Response.json(
      { error: "upstream_error", status: upstream.status, body: text },
      { status: 502 },
    );
  }

  const raw = await upstream.json().catch(() => null);
  // The gateway returns { success, data } from runAgent's wrapper.
  const candidate = (raw as { data?: unknown })?.data ?? raw;
  const validated = commandIntentSchema.safeParse(candidate);
  if (!validated.success) {
    return Response.json({
      intent: "unknown",
      message: "I'm not sure how to help with that.",
    });
  }

  // 6) Drop edit operations whose entityId isn't in the loaded entity list.
  //    Prevents the model from acting on hallucinated ids. If all ops are
  //    dropped, downgrade to `unknown`.
  const cleaned = filterUnknownEntityIds(validated.data, compact);
  if (!cleaned) {
    return Response.json({
      intent: "unknown",
      message: "Couldn't match that to an entity in this branch.",
    });
  }

  // 7) Per-intent pro gate.
  if (PRO_GATED_INTENTS.has(cleaned.intent)) {
    const sub = await requireSubscription(orgId);
    if (!sub.allowed) {
      return Response.json({ requiresPro: true, intent: cleaned.intent });
    }
  }

  return Response.json(cleaned);
}

async function loadCompactEntities(
  orgId: string,
  branchId: string,
): Promise<CompactEntity[]> {
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
        and(
          eq(factions.orgId, orgId),
          eq(factions.branchId, branchId),
          isNull(factions.deletedAt),
        ),
      ),
    db
      .select({ id: scenes.id, title: scenes.title, summary: scenes.summary })
      .from(scenes)
      .where(
        and(
          eq(scenes.orgId, orgId),
          eq(scenes.branchId, branchId),
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

// Drop edit operations whose entityId isn't in the loaded list. Returns null
// if every operation is dropped (caller downgrades to `unknown`).
function filterUnknownEntityIds(
  intent: CommandIntent,
  entities: CompactEntity[],
): CommandIntent | null {
  if (intent.intent !== "edit") return intent;
  const ids = new Set(entities.map((e) => e.id));
  const kept = intent.operations.filter((op) => ids.has(op.entityId));
  if (kept.length === 0) return null;
  return { ...intent, operations: kept };
}
