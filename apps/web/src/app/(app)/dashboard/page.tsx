import { getTranslations } from "next-intl/server";
import { PageHeader } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { ensurePersonalOrg } from "@lore/auth/org";
import { requireSubscription } from "@lore/auth/subscription";
import { ProjectGrid } from "./_components/project-grid";
import { NewProjectButton } from "./_components/new-project-button";

export const metadata = { title: "Projects — Lore" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("Dashboard");

  // A signed-in user must never be redirected to /sign-in — the middleware
  // bounces authenticated users off auth routes straight back to /dashboard,
  // so redirecting here would create an infinite loop. Instead self-heal:
  // resolve (or create) the user's personal org. Sessions created after the
  // session.create.before hook already carry activeOrganizationId; this covers
  // stale sessions that predate it.
  const orgId = session.session.activeOrganizationId ?? (await ensurePersonalOrg(session.user.id));

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
