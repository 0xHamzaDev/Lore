# CLAUDE.md

## Docs Index

| root: `./docs` | |
|---|---|
| routing | `routing/file-based-routing.md`, `routing/navigation.md` |
| data-fetching | `data-fetching/query-pattern.md` |
| ui | `ui/design.md`, `ui/page-anatomy.md` |
| database | `database/schema.md` |
| server | `server/server-functions.md` |
| features | `features/feature-module.md` |

## When to Read Which Doc

| Task | Read |
|---|---|
| Adding a page / route | `routing/file-based-routing.md` → `ui/page-anatomy.md` → `routing/navigation.md` |
| Adding data fetching | `data-fetching/query-pattern.md` → `features/feature-module.md` → `server/server-functions.md` |
| Building UI | `ui/design.md` → `ui/page-anatomy.md` |
| Database changes | `database/schema.md` → `server/server-functions.md` |
| New feature end-to-end | `features/feature-module.md` → all of the above |

## Key Paths

| Concern | Path |
|---|---|
| Next.js app | `apps/web/app/` |
| Shared UI components | `packages/ui/src/` |
| Drizzle schema | `packages/db/src/schema/` |
| Drizzle queries | `packages/db/src/queries/` |
| DB client | `packages/db/src/client.ts` |
| Auth config | `packages/auth/src/` |
| AI wrappers | `packages/ai/src/` |
| Shared utils | `packages/utils/src/` |
| Route constants | `packages/utils/src/routes.ts` |
| TanStack Query keys | `packages/utils/src/query-keys.ts` |
| Shared types | `packages/utils/src/types.ts` |
| Tailwind config | `packages/config/tailwind.config.ts` |
| i18n messages (Arabic) | `apps/web/messages/ar.json` |
| i18n messages (English) | `apps/web/messages/en.json` |
| i18n navigation helpers | `apps/web/src/i18n/navigation.ts` |
| Nav config | `apps/web/config/nav.ts` |
| Middleware | `apps/web/middleware.ts` |
| Migrations | `packages/db/migrations/` |

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript 5 |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | Better-Auth |
| UI primitives | Shadcn/ui + Radix UI |
| Styling | Tailwind CSS v4 |
| Forms | react-hook-form + Zod |
| Server state | TanStack Query v5 |
| AI | Vercel AI SDK + Anthropic |
| i18n / RTL | next-intl (ar default, en) |
| ID generation | cuid2 |

## Rules

### General

- Read the relevant doc(s) before writing any code for a task.
- Never skip auth (`await auth()` or `await requireAuth()`) inside Server Actions.
- Never throw errors to the client — return `ActionResult<T>` unions.
- Never hardcode route strings — use `ROUTES` from `packages/utils/src/routes.ts`.
- Never hardcode query keys inline — use `QK` from `packages/utils/src/query-keys.ts`.

### Architecture

- Server Components are the default. Only add `"use client"` when you need interactivity, browser APIs, or hooks.
- Mutations go through Server Actions — never raw `fetch` to an internal API route from a client component.
- One feature = one vertical slice under its route folder (`_actions.ts`, `_components/`, `_hooks/`).
- Promote to `packages/` only when two or more features need the same code.

### Database

- All primary keys use `cuid2`, never `serial`.
- All tables have `createdAt` and `updatedAt`.
- Use `deletedAt` (soft delete) for user-facing entities.
- Never edit migration files manually — always regenerate with `pnpm db:generate`.
- Derive Zod schemas from Drizzle types using `drizzle-zod` — do not duplicate type definitions.

### UI / Design

- Default surface is white (`#ffffff`). Introduce dark green (`#003c33`) only as full-width bands.
- Primary CTAs are pill-shaped (`rounded-full`) and near-black (`#17171c`) on light surfaces.
- No heavy drop shadows — depth comes from surface alternation and thin borders.
- Coral (`#ff7759`) is for editorial taxonomy only, not general UI.
- Every page has exactly one `<h1>` inside `<PageHeader>`.
- Use RTL-safe Tailwind variants (`rtl:`) — never hardcode `left`/`right` CSS.

### i18n

- Default locale is `ar` (Arabic, RTL).
- All user-facing strings live in `messages/ar.json` and `messages/en.json` — no hardcoded UI strings.
- Use `useTranslations()` (client) or `getTranslations()` (server) from `next-intl`.
- Use `<Link>` and `useRouter` from `apps/web/src/i18n/navigation.ts`, not from `next/navigation` directly.

### AI

- Log every AI operation to the `ai_runs` table for billing and observability.
- Streaming responses use the `/api/chat` route handler pattern (see `server/server-functions.md`).

### Feature Checklist (before marking done)

- [ ] Schema migrated and types exported from `packages/db`
- [ ] Server Actions validate input with Zod and check auth + org role
- [ ] Empty state, loading skeleton, and error boundary in place
- [ ] Route added to `apps/web/config/nav.ts`
- [ ] Arabic + English translations added
- [ ] RTL layout verified at `ar` locale
- [ ] AI usage logged to `ai_runs` (if applicable)
