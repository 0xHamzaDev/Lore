# Lore

AI-driven storytelling SaaS — monorepo scaffold.

## Prerequisites

- Node.js 22+
- pnpm 9+ (`npm install -g pnpm`)

## Setup

The app is three services — the Next.js frontend, a Hono API gateway, and a Node
agents server. AI features route **web → api → agents → Anthropic**, so all three
need env files or the AI flows fail. Copy each example and fill in the values:

```bash
pnpm install

# 1. Frontend
cp apps/web/.env.example apps/web/.env.local

# 2. API gateway (Cloudflare Worker — reads .dev.vars for local `wrangler dev`)
cp apps/api/.env.example apps/api/.dev.vars

# 3. Agents server
cp apps/agents/.env.example apps/agents/.env
```

Then edit the files. Two values **must match across services**:

- `INTERNAL_AGENT_TOKEN` — identical in `apps/api/.dev.vars` and `apps/agents/.env`
- `API_GATEWAY_SECRET` — identical in `apps/web/.env.local` and `apps/api/.dev.vars`

Required external accounts: [Neon](https://neon.tech) (Postgres) and
[Anthropic](https://platform.anthropic.com) (model calls). Optional for local dev —
use dummy values to run without them: [Resend](https://resend.com) (org invite emails)
and [Liveblocks](https://liveblocks.io) (canvas presence).

Run the DB migrations before first boot:

```bash
pnpm --filter @lore/db db:migrate
```

### Background jobs (Inngest)

Background agents run through [Inngest](https://www.inngest.com). For local dev, leave
`INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` blank and run the dev server alongside `pnpm dev`:

```bash
npx inngest-cli@latest dev
```

### Billing (dev stub)

Payments are a **development stub** — checkout simulates a successful payment locally and
charges nothing. Wiring real [Moyasar](https://moyasar.com) hosted checkout is a one-line
swap of the URL returned by the billing action.

## Development

```bash
pnpm dev                           # web (:3000) + api (:8787) + agents (:4000)
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

| Package            | Path                  | Description                        |
| ------------------ | --------------------- | ---------------------------------- |
| `@lore/web`        | `apps/web`            | Next.js 15 App Router frontend     |
| `@lore/api`        | `apps/api`            | Hono.js Cloudflare Workers gateway |
| `@lore/agents`     | `apps/agents`         | Node agents server (Anthropic)     |
| `@lore/ui`         | `packages/ui`         | shadcn/ui component library        |
| `@lore/db`         | `packages/db`         | Drizzle ORM + Neon serverless      |
| `@lore/ai`         | `packages/ai`         | Vercel AI SDK + Anthropic wrappers |
| `@lore/auth`       | `packages/auth`       | Better-Auth config + helpers       |
| `@lore/validators` | `packages/validators` | Shared Zod schemas                 |
| `@lore/config`     | `packages/config`     | tsconfig, eslint, Tailwind base    |

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

## License

[MIT](./LICENSE) © Hamza Alsherif
