import { Liveblocks } from "@liveblocks/node";
import { requireAuth } from "@lore/auth/guard";
import { db, projects, members, and, eq, isNull } from "@lore/db";
import type { NextRequest } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env["LIVEBLOCKS_SECRET_KEY"]!,
});

export async function POST(request: NextRequest) {
  // requireAuth() is OUTSIDE try/catch — let redirect propagate naturally
  const session = await requireAuth();

  let projectId: string | undefined;
  let room: string | undefined;

  try {
    const body = await request.json();
    room = typeof body?.room === "string" ? body.room : undefined;

    if (!room || !room.includes(":")) {
      return new Response("Invalid room id", { status: 400 });
    }

    projectId = room.split(":")[0]!;

    const project = await db
      .select({ orgId: projects.orgId })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project[0]) return new Response("Project not found", { status: 404 });

    // Authorize via either:
    //   (a) explicit `members` row in the project's org, OR
    //   (b) the project's org is the user's active org (personal-org owners
    //       may lack an explicit members row in edge cases — Better-Auth's
    //       create.after hook should insert one, but defense-in-depth here
    //       keeps a stale-session or missing-hook bug from locking the user out).
    const membership = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.organizationId, project[0].orgId), eq(members.userId, session.user.id)))
      .limit(1);

    const isMember = Boolean(membership[0]);
    const isActiveOrgOwner = project[0].orgId === session.session.activeOrganizationId;

    if (!isMember && !isActiveOrgOwner) {
      return new Response("Access denied", { status: 403 });
    }

    const liveblocksSession = liveblocks.prepareSession(session.user.id, {
      userInfo: {
        name: session.user.name ?? "Anonymous",
      },
    });

    liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

    const { status, body: responseBody } = await liveblocksSession.authorize();
    return new Response(responseBody, { status });
  } catch (err) {
    console.error("[liveblocks-auth] failed", {
      userId: session.user.id,
      activeOrgId: session.session.activeOrganizationId,
      projectId,
      room,
      error:
        err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    });
    return new Response("Internal server error", { status: 500 });
  }
}
