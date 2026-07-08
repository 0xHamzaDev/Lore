# Page Anatomy

Every page in the `(dashboard)` and `(marketing)` route groups follows a consistent structure. Deviating from these patterns requires a documented reason.

## Dashboard Page

```
AppShell
├── Sidebar (persistent, collapsible on mobile)
│   ├── SidebarHeader — logo + org switcher
│   ├── SidebarNav — primary nav items
│   └── SidebarFooter — user avatar, settings link
└── Main
    ├── Topbar — page title, breadcrumb, primary CTA
    ├── PageContent — scrollable content area
    │   ├── PageHeader (optional) — title, description, actions
    │   ├── Section* — one or more content sections
    │   └── EmptyState | ErrorState (conditional)
    └── (Sheet / Dialog — overlaid, not inline)
```

### Boilerplate

```tsx
// app/[locale]/(dashboard)/[feature]/page.tsx
import { PageHeader } from "@packages/ui";
import { auth } from "@packages/auth";
import { FeatureList } from "./_components/feature-list";

export const metadata = { title: "Feature — AppName" };

export default async function FeaturePage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <PageHeader
        title="Feature"
        description="Manage your features."
        action={<CreateFeatureButton />}
      />
      <FeatureList orgId={session.orgId} />
    </div>
  );
}
```

### PageHeader

```tsx
<PageHeader
  title="Projects" // required — maps to h1
  description="..." // optional — maps to p.text-muted-foreground
  action={<Button>...</Button>} // optional — right-aligned CTA
  breadcrumb // optional — renders <Breadcrumb /> above title
/>
```

### Section

Group related content into `<Section>` blocks with optional titles:

```tsx
<Section title="Overview" description="Summary of usage this month.">
  <UsageCards />
</Section>

<Section>   {/* untitled section — just visual grouping */}
  <DataTable />
</Section>
```

## Marketing Page

```
AnnouncementBar (optional, site-wide)
Nav
├── Logo (left)
├── Links (center)
└── CTAs (right) — Login + Request Demo

PageContent
├── HeroSection
├── TrustLogoStrip
├── FeatureSections* (alternating light / dark-green)
├── DarkFeatureBand (product capabilities)
├── ProductCardGrid
├── CTASection
└── Footer

Footer
├── Newsletter block
├── Nav columns
└── Legal + locale switcher
```

## Empty States

Always provide an empty state when a list or table can be empty. Use the `<EmptyState>` component:

```tsx
<EmptyState
  icon={FolderOpen}
  title="No projects yet"
  description="Create your first project to get started."
  action={<CreateProjectButton />}
/>
```

## Loading States

Use `loading.tsx` for route-level skeletons and `<Skeleton>` components inline for Suspense boundaries.

```tsx
// _components/project-list-skeleton.tsx
import { Skeleton } from "@packages/ui";

export function ProjectListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-sm" />
      ))}
    </div>
  );
}
```

## Error States

```tsx
// error.tsx (Next.js error boundary)
"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description={error.message}
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
```

## Dialogs and Sheets

Mutations that require a form use:

- **Dialog** — small forms (≤ 4 fields), confirmations, destructive actions
- **Sheet** — larger forms, detail views, multi-step flows

Never navigate to a new page for a simple create/edit form unless the form is complex enough to warrant a dedicated URL.

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Create Project</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Project</DialogTitle>
    </DialogHeader>
    <CreateProjectForm />
  </DialogContent>
</Dialog>
```

## Metadata

Every page must export a `metadata` object:

```tsx
export const metadata = {
  title: "Projects — Sitename",
  description: "Manage your AI projects.",
};
```

For dynamic pages use `generateMetadata`:

```tsx
export async function generateMetadata({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  return { title: `${project.name} — Sitename` };
}
```

## Accessibility

- Every page has exactly one `<h1>` (inside `<PageHeader>`).
- Interactive elements have visible focus rings (`focus-visible:ring-2 ring-focusBlue`).
- RTL layouts use `rtl:` Tailwind variants — never hardcode directional margins/paddings.
- All icons paired with text; standalone icons have `aria-label`.

## Fonts

- In Arabic language use IBM Plex Sans Arabic
