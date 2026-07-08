import { getTranslations } from "next-intl/server";

interface LegalSection {
  heading: string;
  body: string;
}

/**
 * Renders a legal document (privacy / terms) from the `Legal.<doc>` message
 * namespace. Sections are read as a raw array so the copy lives entirely in the
 * message catalogs (ar + en) with no hardcoded strings.
 */
export async function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const t = await getTranslations("Legal");
  const sections = t.raw(`${doc}.sections`) as LegalSection[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-2 border-b border-border-light pb-8">
        <h1 className="font-display text-4xl font-light tracking-tight text-primary">
          {t(`${doc}.title`)}
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t("lastUpdated")}
        </p>
      </div>

      <p className="mt-8 text-base leading-relaxed text-body">
        {t(`${doc}.intro`)}
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-primary">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-body-muted">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
