import { Liveblocks } from "@liveblocks/node";
import { requireAuth } from "@lore/auth/guard";
import { db, projects, members, and, eq, isNull } from "@lore/db";
import type { NextRequest } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const room: string = body.room; // format: "{projectId}:{branchId}"

    if (!room || !room.includes(":")) {
      return new Response("Invalid room id", { status: 400 });
    }

    const projectId = room.split(":")[0]!;

    const project = await db
      .select({ orgId: projects.orgId })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project[0]) return new Response("Project not found", { status: 404 });

    const membership = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.organizationId, project[0].orgId), eq(members.userId, session.user.id)))
      .limit(1);

    if (!membership[0]) return new Response("Access denied", { status: 403 });

    const liveblocksSession = liveblocks.prepareSession(session.user.id, {
      userInfo: {
        name: session.user.name ?? "Anonymous",
      },
    });

    liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

    const { status, body: responseBody } = await liveblocksSession.authorize();
    return new Response(responseBody, { status });
  } catch (err) {
    // Re-throw Next.js redirect errors
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || err.message === "NEXT_NOT_FOUND")
    ) {
      throw err;
    }
    return new Response("Internal server error", { status: 500 });
  }
}
