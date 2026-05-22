import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { eq, and, isNull } from "@lore/db";
import { requireAuth } from "@lore/auth/guard";
import { db, projects, members } from "@lore/db";
import { Skeleton } from "@lore/ui";

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

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#fafaf9]">
      <Skeleton className="h-[60vh] w-[80vw] rounded-sm" />
      <p className="text-sm text-[#93939f]">{t("canvasSkeleton")}</p>
    </div>
  );
}
