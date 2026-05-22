import { requireAuth } from "@lore/auth/guard";
import { db, projects, members, branches, eq, and, isNull } from "@lore/db";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CanvasProvider } from "./_components/canvas-provider";

interface CanvasPageProps {
  params: Promise<{ projectId: string; locale: string }>;
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { projectId } = await params;
  const session = await requireAuth();
  const t = await getTranslations("Projects");

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

  if (!membership[0]) notFound();

  const branchRows = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(and(eq(branches.projectId, project[0].id), eq(branches.orgId, project[0].orgId)))
    .limit(1);

  if (!branchRows[0]) notFound();

  const branch = branchRows[0];

  return (
    <div className="flex h-full w-full flex-col">
      <h1 className="sr-only">{project[0].name}</h1>
      <CanvasProvider roomId={`${project[0].id}:${branch.id}`}>
        {/* TODO Task 8: Replace with <CanvasApp
              projectId={project[0].id}
              branchId={branch.id}
              orgId={project[0].orgId}
              userId={session.user.id}
              userName={session.user.name ?? "Anonymous"}
            /> */}
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-sm text-[#93939f]">{t("canvasSkeleton")}</p>
        </div>
      </CanvasProvider>
    </div>
  );
}
