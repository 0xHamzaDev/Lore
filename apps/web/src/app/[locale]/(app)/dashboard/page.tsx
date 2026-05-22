import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAuth } from "@lore/auth/guard";
import { db, eq, members } from "@lore/db";
import { ROUTES } from "@lore/utils";
import { Topbar } from "../_components/topbar";
import { ProjectGrid } from "./_components/project-grid";
import { ProjectsHeader } from "./_components/projects-header";

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("Dashboard");

  // Prefer the user's active org; fall back to their first membership (e.g. personal org)
  let orgId = session.session.activeOrganizationId ?? null;

  if (!orgId) {
    const membership = await db
      .select({ organizationId: members.organizationId })
      .from(members)
      .where(eq(members.userId, session.user.id))
      .limit(1);
    orgId = membership[0]?.organizationId ?? null;
  }

  if (!orgId) redirect(ROUTES.signIn);

  return (
    <>
      <Topbar title={t("title")} action={<ProjectsHeader orgId={orgId} />} />
      <ProjectGrid orgId={orgId} />
    </>
  );
}
