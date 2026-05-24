import { requireAuth } from "@lore/auth/guard";
import { requireSubscription } from "@lore/auth/subscription";
import { db, projects, members, branches, eq, and, isNull, asc } from "@lore/db";
import { notFound } from "next/navigation";
import { CanvasProvider } from "./_components/canvas-provider";
import { CanvasApp } from "./_components/canvas-app";
import { BranchSwitcher } from "./_components/branch-switcher";

interface CanvasPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ branchId?: string }>;
}

export default async function CanvasPage({ params, searchParams }: CanvasPageProps) {
  const { projectId } = await params;
  const { branchId: requestedBranchId } = await searchParams;
  const session = await requireAuth();

  const project = await db
    .select({ id: projects.id, orgId: projects.orgId, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project[0]) notFound();

  const membership = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, project[0].orgId), eq(members.userId, session.user.id)))
    .limit(1);

  // Mirror /api/liveblocks-auth: allow either explicit member row OR active-org owner.
  // Keeps personal-org owners (whose members row may be missing in edge cases) from being 404'd.
  const isMember = Boolean(membership[0]);
  const isActiveOrgOwner = project[0].orgId === session.session.activeOrganizationId;
  if (!isMember && !isActiveOrgOwner) notFound();

  const branchRows = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(and(eq(branches.projectId, project[0].id), eq(branches.orgId, project[0].orgId)))
    .orderBy(asc(branches.createdAt));

  if (!branchRows[0]) notFound();

  // Resolve the active branch from ?branchId=. An absent or unknown id (e.g. a
  // tampered URL, or a branch from another project) falls back to main, which
  // is branchRows[0] because main is created first and the list is createdAt-asc.
  const currentBranch = branchRows.find((b) => b.id === requestedBranchId) ?? branchRows[0];
  const roomId = `${project[0].id}:${currentBranch.id}`;

  // Resolve the plan server-side so free users hit the upgrade modal on the wand
  // without ever firing an AI request.
  const subscription = await requireSubscription(project[0].orgId);
  const isPro = subscription.allowed;

  return (
    <div className="flex h-full w-full flex-col">
      <h1 className="sr-only">{project[0].name}</h1>
      <div className="flex h-12 shrink-0 items-center border-b border-[#e5e5e7] bg-white px-4">
        <BranchSwitcher
          projectId={project[0].id}
          orgId={project[0].orgId}
          currentBranchId={currentBranch.id}
          branches={branchRows}
        />
      </div>
      {/* key={roomId} remounts the room subtree on branch switch: the tldraw
          store is created+seeded once per mount, so a fresh mount is how the
          new branch's entities load and the old branch's shapes are dropped.
          The Liveblocks client is a module singleton, so only the room
          reconnects — nothing higher in the tree tears down. */}
      <div className="relative min-h-0 flex-1">
        <CanvasProvider key={roomId} roomId={roomId}>
          <CanvasApp
            projectId={project[0].id}
            branchId={currentBranch.id}
            orgId={project[0].orgId}
            userId={session.user.id}
            userName={session.user.name ?? "Anonymous"}
            isPro={isPro}
          />
        </CanvasProvider>
      </div>
    </div>
  );
}
