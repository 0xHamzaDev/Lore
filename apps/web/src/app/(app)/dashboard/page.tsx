import { getTranslations } from "next-intl/server";
import { PageHeader } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { resolveActiveOrgId } from "@lore/auth/active-org";
import { requireSubscription } from "@lore/auth/subscription";
import { ProjectGrid } from "./_components/project-grid";
import { NewProjectButton } from "./_components/new-project-button";

export const metadata = { title: "Projects — Lore" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("Dashboard");

  // Never redirect an authenticated user to /sign-in on a missing org — the
  // middleware bounces session-cookie holders off /sign-in back to /dashboard,
  // an infinite loop. resolveActiveOrgId self-heals an org-less account instead.
  const orgId = await resolveActiveOrgId(
    session.user,
    session.session.activeOrganizationId,
  );

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
