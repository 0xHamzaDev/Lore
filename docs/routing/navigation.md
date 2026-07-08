# Navigation

## Client-Side Navigation

Use Next.js `<Link>` for all internal navigation. Never use `<a>` for internal routes.

```tsx
import Link from "next/link";

// Basic
<Link href="/dashboard">Dashboard</Link>;

// With locale param (next-intl)
import { Link } from "@/i18n/navigation";
<Link href="/dashboard">Dashboard</Link>; // locale is injected automatically
```

## Programmatic Navigation

```tsx
import { useRouter } from "@/i18n/navigation";

const router = useRouter();

// Navigate
router.push("/dashboard");

// Replace (no history entry)
router.replace("/login");

// After Server Action
import { redirect } from "next/navigation";
redirect("/dashboard"); // server-side redirect
```

## Route Constants

Never hardcode path strings inline. Define all routes in `packages/utils/src/routes.ts`:

```ts
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  projects: {
    list: "/projects",
    detail: (id: string) => `/projects/${id}`,
    settings: (id: string) => `/projects/${id}/settings`,
  },
  settings: {
    profile: "/settings/profile",
    billing: "/settings/billing",
    team: "/settings/team",
  },
} as const;
```

Usage:

```tsx
<Link href={ROUTES.projects.detail(project.id)}>View Project</Link>
```

## Active Link Detection

```tsx
"use client";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@packages/utils";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
```

## Sidebar Navigation

The `(dashboard)` layout renders a persistent sidebar defined in `packages/ui/src/sidebar.tsx`.

Structure:

```
<AppShell>
  <Sidebar>
    <SidebarHeader>  ← Logo + org switcher
    <SidebarNav>     ← Primary nav items
    <SidebarFooter>  ← User avatar + settings
  </Sidebar>
  <main>{children}</main>
</AppShell>
```

Nav items are driven by a config array in `apps/web/config/nav.ts` — add new routes there, not in the component.

## Breadcrumbs

Use the `<Breadcrumb>` component from `packages/ui`. It reads the current pathname and maps segments using `apps/web/config/breadcrumb-labels.ts`.

```tsx
<Breadcrumb /> // auto-generates from pathname
```

## Locale Switcher

```tsx
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      onClick={() =>
        router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" })
      }
    >
      {locale === "ar" ? "EN" : "عربي"}
    </button>
  );
}
```

## Back Navigation

Prefer explicit `href` over `router.back()` — back() breaks on direct URL access.

```tsx
// ✅ Good
<Link href={ROUTES.projects.list}>← Back to Projects</Link>

// ❌ Avoid
<button onClick={() => router.back()}>Back</button>
```
