import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { requireSubscription } from "@lore/auth/subscription";
import { db, eq, members } from "@lore/db";
import { ROUTES } from "@lore/utils";
import { ProjectGrid } from "./_components/project-grid";
import { NewProjectButton } from "./_components/new-project-button";

export const metadata = { title: "Projects — Lore" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("Dashboard");

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

  const subscription = await requireSubscription(orgId);
  const isPro = subscription.allowed;

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={<NewProjectButton orgId={orgId} isPro={isPro} />}
      />
      <ProjectGrid orgId={orgId} isPro={isPro} />
    </div>
  );
}
