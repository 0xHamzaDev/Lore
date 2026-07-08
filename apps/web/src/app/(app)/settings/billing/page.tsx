import { getLocale, getTranslations } from "next-intl/server";
import { db, subscriptions, members as membersTable, and, eq } from "@lore/db";
import { Section, Badge } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { BillingPanel } from "./_components/billing-panel";

type PlanState = "free" | "active" | "cancelled" | "past_due";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; error?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const t = await getTranslations("Billing");
  const locale = await getLocale();

  let orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    const membership = await db
      .select({ organizationId: membersTable.organizationId })
      .from(membersTable)
      .where(eq(membersTable.userId, session.user.id))
      .limit(1);
    orgId = membership[0]?.organizationId ?? "";
  }

  // Only owners can manage billing (matches requireOrgRole(orgId, "owner") on
  // the actions). Non-owners see a read-only plan card.
  const [membership] = orgId
    ? await db
        .select({ role: membersTable.role })
        .from(membersTable)
        .where(
          and(
            eq(membersTable.organizationId, orgId),
            eq(membersTable.userId, session.user.id),
          ),
        )
        .limit(1)
    : [];
  const canManage = membership?.role === "owner";

  const [row] = orgId
    ? await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.orgId, orgId))
        .limit(1)
    : [];

  const state: PlanState = !row
    ? "free"
    : row.status === "active"
      ? "active"
      : row.status === "cancelled"
        ? "cancelled"
        : "past_due";

  const planLabel = state === "free" ? t("plans.free") : t("plans.pro");
  const statusVariant: Record<
    PlanState,
    "default" | "outline" | "mono" | "coral"
  > = {
    free: "outline",
    active: "default",
    cancelled: "mono",
    past_due: "coral",
  };

  return (
    <>
      {params.upgraded ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {t("flash.upgraded")}
        </div>
      ) : null}
      {params.error === "forbidden" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {t("flash.forbidden")}
        </div>
      ) : null}

      <Section
        title={t("planSection.title")}
        description={t("planSection.description")}
        bordered
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-medium">{planLabel}</span>
            <Badge variant={statusVariant[state]}>{t(`status.${state}`)}</Badge>
          </div>
          {row ? (
            <p className="text-sm text-body-muted">
              {state === "cancelled"
                ? t("renewal.accessUntil", {
                    date: formatDate(row.currentPeriodEnd, locale),
                  })
                : t("renewal.renewsOn", {
                    date: formatDate(row.currentPeriodEnd, locale),
                  })}
            </p>
          ) : (
            <p className="text-sm text-body-muted">
              {t("renewal.noSubscription")}
            </p>
          )}
          {canManage ? (
            <BillingPanel orgId={orgId} state={state} />
          ) : (
            <p className="text-sm text-body-muted">{t("ownerOnly")}</p>
          )}
        </div>
      </Section>

      <Section
        title={t("invoices.title")}
        description={t("invoices.description")}
        bordered
      >
        <p className="text-sm text-body-muted">{t("invoices.empty")}</p>
      </Section>
    </>
  );
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
