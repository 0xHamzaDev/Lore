import { getTranslations } from "next-intl/server";
import { Section } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { ProfileForm } from "./_components/profile-form";
import { LanguageForm } from "./_components/language-form";

export default async function ProfileSettingsPage() {
  const session = await requireAuth();
  const t = await getTranslations("Settings.profile");

  return (
    <>
      <Section
        title={t("account")}
        description={t("accountDescription")}
        bordered
      >
        <ProfileForm
          user={{
            name: session.user.name ?? "",
            email: session.user.email,
            image: session.user.image ?? null,
          }}
        />
      </Section>

      <Section
        title={t("preferences")}
        description={t("preferencesDescription")}
        bordered
      >
        <LanguageForm />
      </Section>
    </>
  );
}
