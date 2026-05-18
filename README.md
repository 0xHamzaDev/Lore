# Lore

AI-driven storytelling SaaS — monorepo scaffold.

## Prerequisites

- Node.js 22+
- pnpm 9+ (`npm install -g pnpm`)

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your DATABASE_URL and ANTHROPIC_API_KEY
```

## Development

```bash
pnpm dev                           # all apps in parallel
pnpm --filter @lore/web dev        # Next.js only
pnpm --filter @lore/api dev        # Hono/Wrangler only
pnpm --filter @lore/agents dev     # agents only
```

## Checks

```bash
pnpm typecheck   # TypeScript — all packages
pnpm lint        # ESLint — all packages
pnpm build       # production build — all apps
```

## Workspace

| Package | Path | Description |
|---------|------|-------------|
| `@lore/web` | `apps/web` | Next.js 15 App Router frontend |
| `@lore/api` | `apps/api` | Hono.js Cloudflare Workers API |
| `@lore/agents` | `apps/agents` | LangGraph agent workers |
| `@lore/ui` | `packages/ui` | shadcn/ui component library |
| `@lore/db` | `packages/db` | Drizzle ORM + Neon serverless |
| `@lore/ai` | `packages/ai` | Vercel AI SDK + Anthropic wrappers |
| `@lore/validators` | `packages/validators` | Shared Zod schemas |
| `@lore/config` | `packages/config` | tsconfig, eslint, Tailwind base |

## Database

```bash
pnpm --filter @lore/db db:generate   # generate migrations from schema
pnpm --filter @lore/db db:migrate    # run pending migrations
pnpm --filter @lore/db db:studio     # open Drizzle Studio UI
```

## Adding a shadcn component

```bash
cd apps/web
pnpm dlx shadcn@latest add button
# Move generated component to packages/ui/src/components/ if it should be shared
```
