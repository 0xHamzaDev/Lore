import { getTranslations } from "next-intl/server";
import { PageHeader } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { SettingsTabs } from "./_components/settings-tabs";

export const metadata = { title: "Settings — Lore" };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsTabs />
      <div className="flex flex-col gap-10">{children}</div>
    </div>
  );
}
