import { auth } from "@lore/auth";
import { headers } from "next/headers";
import { requireOrgRole } from "@lore/auth/permissions";
import { requireSubscription } from "@lore/auth/subscription";
import { db, agentFindings, aiRuns, projects, and, desc, eq } from "@lore/db";

export const dynamic = "force-dynamic";

// Findings polling endpoint. Reads Postgres directly — no AI hop. Returns the
// findings list, the latest agent run's start/completion timestamps (for the
// "Story check running…" indicator), and a freeTeaser flag for free orgs.
export async function GET(req: Request): Promise<Response> {
  // Explicit session check — this is a JSON polling endpoint, so return a real
  // 401 rather than requireAuth()'s page-oriented redirect to /sign-in (which
  // would hand a fetch() caller an HTML body it can't parse).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const branchId = url.searchParams.get("branchId");
  if (!projectId || !branchId) {
    return Response.json(
      { error: "missing projectId or branchId" },
      { status: 400 },
    );
  }

  // Resolve org from the project so we can role-check.
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return Response.json({ error: "not_found" }, { status: 404 });

  const role = await requireOrgRole(project.orgId, "viewer");
  if (!role.success)
    return Response.json({ error: "forbidden" }, { status: 403 });

  // Free orgs get a static teaser — no count, no findings (no runs happen).
  const sub = await requireSubscription(project.orgId);
  if (sub.plan === "free") {
    return Response.json({ findings: [], runStatus: null, freeTeaser: true });
  }

  // Open findings only for the live UI; resolved/dismissed are debug-only.
  const findings = await db
    .select()
    .from(agentFindings)
    .where(
      and(
        eq(agentFindings.projectId, projectId),
        eq(agentFindings.branchId, branchId),
        eq(agentFindings.status, "open"),
      ),
    );

  // Latest agent run for this project — used to render "Story check running…"
  // and to detect newly-completed runs for the toast.
  const [latestRun] = await db
    .select({ startedAt: aiRuns.createdAt })
    .from(aiRuns)
    .where(and(eq(aiRuns.projectId, projectId), eq(aiRuns.runType, "agent")))
    .orderBy(desc(aiRuns.createdAt))
    .limit(1);

  // "running" = the latest agent ai_runs row was inserted within the last 60s
  // and there's no row newer. Crude but avoids a separate runs table — agent
  // runs finish in 5–20s, so by the time a poll catches it the row is "old".
  const runStatus = latestRun
    ? {
        startedAt: latestRun.startedAt.toISOString(),
        completedAt:
          Date.now() - latestRun.startedAt.getTime() > 60_000
            ? latestRun.startedAt.toISOString()
            : null,
      }
    : null;

  return Response.json({ findings, runStatus });
}
