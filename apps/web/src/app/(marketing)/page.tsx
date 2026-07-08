import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Film,
  MapPin,
  Shield,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Lore — Build worlds that breathe",
  description:
    "Give your story's characters, places, and factions a shared memory — built and connected by AI.",
};

const ENTITY_ICONS: Record<
  "character" | "location" | "faction" | "scene" | "event",
  LucideIcon
> = {
  character: Users,
  location: MapPin,
  faction: Shield,
  scene: Film,
  event: Clock,
};

const TRUST_NAMES = [
  "Worldbuilders",
  "StoryForge",
  "NarrativeOS",
  "Chronicle",
  "Inkwell",
  "Plotline",
];

function MonoLabel({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "light" | "deep";
}) {
  const toneClass =
    tone === "light"
      ? "text-pale-green/70"
      : tone === "deep"
        ? "text-deep-green"
        : "text-muted";
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  );
}

function CanvasMockup() {
  const t = useTranslations("Marketing.hero.mockup");
  const entityTypes = useTranslations("Canvas.entityTypes");

  return (
    <div className="relative overflow-hidden rounded-lg bg-primary aspect-[4/3] w-full">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-product-dark-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {[
          [22, 30, 72, 22],
          [22, 30, 35, 68],
          [72, 22, 78, 62],
          [35, 68, 78, 62],
        ].map(([x1, y1, x2, y2]) => (
          <line
            key={`${x1}-${y1}-${x2}-${y2}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-muted)"
            strokeWidth="0.4"
            strokeDasharray="2,2"
          />
        ))}
      </svg>

      <div className="absolute start-[10%] top-[18%] w-36 rounded-sm border border-product-dark-border bg-product-dark p-3">
        <div className="mb-1">
          <MonoLabel>{entityTypes("character")}</MonoLabel>
        </div>
        <div className="text-sm font-medium text-canvas">{t("character")}</div>
        <div className="mt-0.5 text-xs text-body-muted">
          {t("characterMeta")}
        </div>
      </div>

      <div className="absolute end-[8%] top-[12%] w-36 rounded-sm border border-product-dark-border bg-product-dark p-3">
        <div className="mb-1">
          <MonoLabel>{entityTypes("location")}</MonoLabel>
        </div>
        <div className="text-sm font-medium text-canvas">{t("location")}</div>
        <div className="mt-0.5 text-xs text-body-muted">
          {t("locationMeta")}
        </div>
      </div>

      <div className="absolute start-[22%] bottom-[18%] w-40 rounded-sm border border-product-dark-border bg-product-dark p-3">
        <div className="mb-1">
          <MonoLabel>{entityTypes("faction")}</MonoLabel>
        </div>
        <div className="text-sm font-medium text-canvas">{t("faction")}</div>
        <div className="mt-0.5 text-xs text-body-muted">{t("factionMeta")}</div>
      </div>

      <div className="absolute end-[12%] bottom-[20%] w-36 rounded-sm border border-deep-green-border bg-deep-green p-3">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-pale-green/70">
          {entityTypes("timelineEvent")}
        </div>
        <div className="text-sm font-medium text-canvas">{t("event")}</div>
        <div className="mt-0.5 text-xs text-pale-green/50">
          {t("eventMeta")}
        </div>
      </div>

      <div className="absolute bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 flex items-center gap-2 rounded-full border border-product-dark-border bg-product-dark/90 px-3 py-1.5 backdrop-blur-sm">
        <span
          className="h-1.5 w-1.5 rounded-full bg-pale-green animate-pulse"
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] text-muted">{t("status")}</span>
      </div>
    </div>
  );
}

function AnnouncementBar() {
  const t = useTranslations("Marketing");
  return (
    <div className="flex h-9 items-center justify-center gap-2 bg-primary px-4">
      <span className="text-xs text-canvas/70">{t("announcement")}</span>
      <Link
        href={ROUTES.signUp}
        className="text-xs text-canvas underline-offset-2 hover:underline inline-flex items-center gap-1"
      >
        {t("announcementLink")}
        <ArrowRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </div>
  );
}

function Hero() {
  const t = useTranslations("Marketing.hero");
  return (
    <section className="relative overflow-hidden bg-canvas pt-24 pb-20 lg:pt-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-deep-green"
              aria-hidden="true"
            />
            <span className="font-mono text-xs text-body-muted">
              {t("eyebrow")}
            </span>
          </div>

          <h1 className="font-display text-6xl italic font-light leading-none tracking-tight text-primary sm:text-7xl lg:text-8xl">
            {t("headline")}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-body-muted">
            {t("sub")}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={ROUTES.signUp}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-medium text-canvas transition-colors hover:bg-primary/90"
            >
              {t("cta")}
              <ArrowRight
                className="h-4 w-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
            <a
              href="#features"
              className="text-sm text-body-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {t("secondaryCta")}
            </a>
          </div>

          <div className="mt-16 w-full max-w-4xl">
            <CanvasMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const t = useTranslations("Marketing.trust");
  return (
    <section className="border-y border-border-light bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center text-sm text-muted">{t("label")}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUST_NAMES.map((name) => (
            <span
              key={name}
              lang="en"
              dir="ltr"
              className="font-display text-lg italic font-light text-hairline"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CharactersFeature() {
  const t = useTranslations("Marketing.features.characters");
  const entityTypes = useTranslations("Canvas.entityTypes");
  const heroMockup = useTranslations("Marketing.hero.mockup");
  return (
    <section id="features" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="mb-4">
              <MonoLabel>{t("label")}</MonoLabel>
            </div>
            <h2 className="font-display text-5xl italic font-light leading-tight text-primary">
              {t("heading")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-body-muted">
              {t("body")}
            </p>
          </div>

          <div className="rounded-md border border-border-light bg-canvas p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-stone">
                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <MonoLabel>{entityTypes("character")}</MonoLabel>
                <div className="text-base font-medium text-primary">
                  {heroMockup("character")}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {(["role", "age", "backstory"] as const).map((key) => (
                <div
                  key={key}
                  className="flex gap-3 border-t border-card-border pt-3"
                >
                  <span className="w-20 shrink-0 text-xs text-muted">
                    {t(`card.${key}`)}
                  </span>
                  <span className="text-sm text-ink">
                    {t(`card.${key}Value`)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-sm bg-pale-green px-3 py-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-deep-green"
                aria-hidden="true"
              />
              <span className="text-xs text-deep-green">
                {t("card.aiHint")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CanvasFeature() {
  const t = useTranslations("Marketing.features.canvas");
  const entityTypes = useTranslations("Canvas.entityTypes");
  return (
    <section className="bg-deep-green py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-pale-green/60">
            {t("label")}
          </div>
          <h2 className="font-display text-5xl italic font-light leading-tight text-canvas">
            {t("heading")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-pale-green/70">
            {t("body")}
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {(
            [
              { key: "feature1", icon: "●" },
              { key: "feature2", icon: "◆" },
              { key: "feature3", icon: "■" },
            ] as const
          ).map(({ key, icon }) => (
            <div
              key={key}
              className="rounded-sm border border-deep-green-border bg-deep-green-deep px-6 py-5"
            >
              <span
                className="mb-3 block text-sm text-pale-green/40"
                aria-hidden="true"
              >
                {icon}
              </span>
              <p className="text-base text-canvas">{t(key)}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-lg border border-deep-green-border bg-deep-green-deepest">
          <div
            className="flex h-48 items-center justify-center"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-deep-green-border) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div className="flex items-center gap-3">
              {(
                ["character", "location", "faction", "timelineEvent"] as const
              ).map((key, i) => (
                <div
                  key={key}
                  className="rounded-sm border border-deep-green-border bg-deep-green-deep px-3 py-2 text-center"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-pale-green/50">
                    {entityTypes(key)}
                  </div>
                  <div className="mt-0.5 text-xs text-canvas">···</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineFeature() {
  const t = useTranslations("Marketing.features.timeline");
  const events = [
    { dayKey: "day1", labelKey: "day1Label", accent: false },
    { dayKey: "day43", labelKey: "day43Label", accent: true },
    { dayKey: "day97", labelKey: "day97Label", accent: false },
    { dayKey: "day143", labelKey: "day143Label", accent: true },
  ] as const;

  return (
    <section className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1 rounded-md border border-border-light bg-canvas p-6">
            <div>
              {events.map(({ dayKey, labelKey, accent }, i) => (
                <div key={dayKey} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${accent ? "bg-primary" : "bg-hairline"}`}
                    />
                    {i < events.length - 1 && (
                      <div className="w-px flex-1 bg-border-light" />
                    )}
                  </div>
                  <div className="pb-5">
                    <MonoLabel>{t(`events.${dayKey}`)}</MonoLabel>
                    <div
                      className={`mt-0.5 text-sm ${accent ? "text-primary font-medium" : "text-body-muted"}`}
                    >
                      {t(`events.${labelKey}`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-4">
              <MonoLabel>{t("label")}</MonoLabel>
            </div>
            <h2 className="font-display text-5xl italic font-light leading-tight text-primary">
              {t("heading")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-body-muted">
              {t("body")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EntityGrid() {
  const t = useTranslations("Marketing.entities");
  return (
    <section id="entities" className="bg-soft-stone py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="font-display text-5xl italic font-light leading-tight text-primary">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-body-muted">{t("sub")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            ["character", "location", "faction", "scene", "event"] as const
          ).map((type) => {
            const Icon = ENTITY_ICONS[type];
            return (
              <div
                key={type}
                className="rounded-sm border border-hairline bg-canvas px-6 py-6 transition-colors hover:border-primary/40"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-soft-stone">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="mb-1 text-base font-medium text-primary">
                  {t(`${type}.name`)}
                </div>
                <p className="text-sm leading-relaxed text-body-muted">
                  {t(`${type}.desc`)}
                </p>
              </div>
            );
          })}

          <div className="flex flex-col items-start justify-end rounded-sm border border-dashed border-hairline bg-transparent px-6 py-6">
            <div className="mb-1 text-base font-medium text-muted">
              {t("more")}
            </div>
            <p className="text-sm text-muted">{t("moreDesc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const t = useTranslations("Marketing.pricing");
  const freeFeatures = ["f1", "f2", "f3", "f4"] as const;
  const proFeatures = ["f1", "f2", "f3", "f4", "f5"] as const;

  return (
    <section id="pricing" className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
            {t("eyebrow")}
          </div>
          <h2 className="font-display text-5xl italic font-light leading-tight text-primary">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-body-muted">{t("sub")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-lg border border-hairline bg-canvas p-8">
            <div className="text-base font-medium text-primary">
              {t("free.name")}
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-medium text-primary">
                {t("free.price")}
              </span>
              <span className="text-sm text-body-muted">
                {t("free.period")}
              </span>
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {freeFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-body"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{t(`free.${f}`)}</span>
                </li>
              ))}
            </ul>
            <Link
              href={ROUTES.signUp}
              className="mt-8 inline-flex items-center justify-center rounded-full border border-primary px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-soft-stone"
            >
              {t("free.cta")}
            </Link>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-lg border-2 border-primary bg-canvas p-8">
            <div className="flex items-center justify-between">
              <div className="text-base font-medium text-primary">
                {t("pro.name")}
              </div>
              <span className="rounded-full bg-deep-green px-3 py-1 text-[11px] font-medium text-pale-green">
                {t("pro.badge")}
              </span>
            </div>
            <div className="mt-3 text-sm text-body-muted">
              {t("pro.priceNote")}
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {proFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-body"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{t(`pro.${f}`)}</span>
                </li>
              ))}
            </ul>
            <Link
              href={ROUTES.signUp}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-canvas transition-colors hover:bg-primary/90"
            >
              {t("pro.cta")}
              <ArrowRight
                className="h-4 w-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations("Marketing.ctaSection");
  return (
    <section className="bg-canvas py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-6xl italic font-light leading-none tracking-tight text-primary">
            {t("heading")}
          </h2>
          <p className="mt-6 text-lg text-body-muted">{t("sub")}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={ROUTES.signUp}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-canvas transition-colors hover:bg-primary/90"
            >
              {t("cta")}
              <ArrowRight
                className="h-4 w-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {(["guarantee1", "guarantee2", "guarantee3"] as const).map(
              (key) => (
                <div key={key} className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 text-deep-green"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-body-muted">{t(key)}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MarketingPage() {
  return (
    <main>
      <AnnouncementBar />
      <Hero />
      <TrustStrip />
      <CharactersFeature />
      <CanvasFeature />
      <TimelineFeature />
      <EntityGrid />
      <PricingSection />
      <CtaSection />
    </main>
  );
}
