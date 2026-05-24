import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Button, Section } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { ROUTES } from "@lore/utils";
import { confirmStubCheckoutAction } from "../_actions";

// Dev-only stub page that stands in for Moyasar's hosted checkout. Mirrors the
// real flow's shape: user lands here from startCheckoutAction, clicks "Pay",
// and the server action upserts the subscription before redirecting back.
// Replacing the stub with real Moyasar is a one-line swap of the URL returned
// from startCheckoutAction.
export default async function CheckoutStubPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const orgId = params.orgId;
  const t = await getTranslations("Billing.checkoutStub");

  if (!orgId) {
    redirect(ROUTES.settings.billing);
  }

  async function confirm() {
    "use server";
    await confirmStubCheckoutAction({ orgId });
  }

  return (
    <Section title={t("title")} description={t("description")} bordered>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-body-muted">{t("planLabel")}</span>
          <span className="text-lg font-medium">{t("planName")}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-body-muted">{t("priceLabel")}</span>
          <span className="text-2xl font-semibold">{t("price")}</span>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("devNotice")}
        </div>
        <form action={confirm}>
          <Button type="submit" className="w-full">
            {t("payCta")}
          </Button>
        </form>
      </div>
    </Section>
  );
}
