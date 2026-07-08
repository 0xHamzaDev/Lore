# File-Based Routing

## Stack

- **Framework**: Next.js 15 (App Router)
- **Monorepo**: Turborepo
- **Language**: TypeScript 5

## Monorepo Structure

```
apps/
  web/                          # Main Next.js application
    app/
      [locale]/                 # ar | en (next-intl)
        (marketing)/            # Public-facing pages (unauthenticated)
          page.tsx              # / — Landing
          pricing/page.tsx
          about/page.tsx
        (dashboard)/            # Authenticated app shell
          layout.tsx            # Shared sidebar + topbar
          dashboard/page.tsx
          [feature]/
            page.tsx
            [id]/page.tsx
        (auth)/                 # Login / register / verify (no shell)
          login/page.tsx
          register/page.tsx
          verify/page.tsx
      api/                      # Route handlers (locale-agnostic)
        [...]/route.ts
    middleware.ts               # Auth guard + locale redirect
  admin/                        # Internal admin panel (separate Next.js app)

packages/
  ui/                           # Shared Shadcn + custom components
  db/                           # Drizzle schema + client
  auth/                         # Better-Auth config
  ai/                           # Vercel AI SDK wrappers
  config/                       # Shared ESLint, TS, Tailwind configs
  utils/                        # Shared helpers (cn, dates, formatters)
```

## Route Group Conventions

| Group         | Purpose                 | Auth Required                            |
| ------------- | ----------------------- | ---------------------------------------- |
| `(marketing)` | Public marketing & docs | No                                       |
| `(dashboard)` | Product shell           | Yes — redirects to `/login`              |
| `(auth)`      | Login, register, verify | No — redirects to `/dashboard` if authed |

## File Naming

| File            | Purpose                                   |
| --------------- | ----------------------------------------- |
| `page.tsx`      | Leaf page component                       |
| `layout.tsx`    | Persistent shell wrapping child pages     |
| `loading.tsx`   | Suspense skeleton shown during navigation |
| `error.tsx`     | Error boundary for that segment           |
| `not-found.tsx` | 404 handler                               |
| `route.ts`      | API route handler (GET, POST, …)          |

## Segment Patterns

| Pattern     | Example                   | Use                          |
| ----------- | ------------------------- | ---------------------------- |
| `[id]`      | `projects/[id]/page.tsx`  | Single dynamic segment       |
| `[...slug]` | `docs/[...slug]/page.tsx` | Catch-all (docs, blog)       |
| `(group)`   | `(dashboard)/layout.tsx`  | Route group — no URL segment |
| `_folder`   | `_components/`            | Private — not routable       |

## Middleware

```ts
// apps/web/middleware.ts
export { auth as middleware } from "@packages/auth";

export const config = {
  matcher: ["/((?!_next|api|favicon|_vercel).*)"],
};
```

Execution order:

1. Locale detection → redirect `/` → `/ar` (default) or `/en`
2. Auth check → unauthenticated `(dashboard)` → `/[locale]/login`
3. Auth check → authenticated `(auth)` → `/[locale]/dashboard`

## Locale / RTL

Saudi-first product. Default locale is `ar` (RTL). Supported locales: `["ar", "en"]`.

- `next-intl` handles message loading and `dir` attribute.
- All copy lives in `messages/ar.json` and `messages/en.json`.
- Tailwind uses `rtl:` variants for directional utilities.

## Colocation Pattern

Keep route-specific code next to the page:

```
app/[locale]/(dashboard)/projects/
  page.tsx             # Route entry
  _components/         # UI only used here
  _hooks/              # Local React hooks
  _actions.ts          # Server Actions for this route
```
