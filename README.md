# Lore

AI-driven storytelling SaaS — Turborepo monorepo.

Lore runs as a **single Next.js app on Vercel**. AI features (field generation, the
worldbuilding wizard, and slash commands) execute **in-process inside the Next.js API
routes** (`apps/web/src/app/api/ai/*`) and call **Ollama Cloud** — an OpenAI-compatible
endpoint — for model inference. There is no separate model backend to deploy.

> **Legacy:** the `apps/api` Cloudflare Worker gateway and the standalone `apps/agents`
> HTTP server are no longer on the request path. The agent logic they hosted now lives in
> the `@lore/agents` package and is imported directly by the web routes; both apps are
> kept in the tree for reference. See [Legacy gateway](#legacy-gateway-optional) if you
> want to run the old `web → api → agents` topology.

## Prerequisites

- Node.js 22+
- pnpm 9+ (`npm install -g pnpm`)

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`:

| Variable                          | Required          | Where to get it                                             |
| --------------------------------- | ----------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                    | yes               | [Neon](https://neon.tech) Postgres connection string        |
| `OLLAMA_API_KEY`                  | yes               | [Ollama](https://ollama.com) — powers all model calls       |
| `BETTER_AUTH_SECRET`              | yes               | `openssl rand -base64 32`                                    |
| `BETTER_AUTH_URL`                 | yes               | `http://localhost:3000` for local dev                       |
| `RESEND_API_KEY`                  | dev: dummy        | [Resend](https://resend.com) — org invitation emails        |
| `LIVEBLOCKS_SECRET_KEY`           | dev: dummy        | [Liveblocks](https://liveblocks.io) — canvas presence       |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL`| optional          | override endpoint / model tag (default `gpt-oss:20b`)        |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | dev: blank | [Inngest](https://www.inngest.com) — background jobs (below) |

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

### Legacy gateway (optional)

The old **web → api → agents** topology still builds but is not needed — AI runs
in-process. To run it anyway, copy the two extra env files and keep the shared secrets in
sync:

```bash
cp apps/api/.env.example apps/api/.dev.vars    # Cloudflare Worker (reads .dev.vars for wrangler dev)
cp apps/agents/.env.example apps/agents/.env    # Node agents server
```

- `INTERNAL_AGENT_TOKEN` — identical in `apps/api/.dev.vars` and `apps/agents/.env`
- `API_GATEWAY_SECRET` — identical in `apps/web/.env.local` and `apps/api/.dev.vars`
- point the web app at the gateway with `API_GATEWAY_URL`

## Development

```bash
pnpm dev                           # web (:3000) + api (:8787) + agents (:4000)
pnpm --filter @lore/web dev        # Next.js only — all you need; AI runs in-process
pnpm --filter @lore/api dev        # Hono/Wrangler only (legacy)
pnpm --filter @lore/agents dev     # agents server only (legacy)
```

## Checks

```bash
pnpm typecheck   # TypeScript — all packages
pnpm lint        # ESLint — all packages
pnpm build       # production build — all apps
pnpm format      # Biome — format the repo
```

## Workspace

| Package            | Path                  | Description                                    |
| ------------------ | --------------------- | --------------------------------------------- |
| `@lore/web`        | `apps/web`            | Next.js 15 App Router frontend + in-process AI |
| `@lore/api`        | `apps/api`            | Hono.js Cloudflare Workers gateway (legacy)   |
| `@lore/agents`     | `apps/agents`         | Agent run functions (imported by web); legacy standalone server |
| `@lore/ui`         | `packages/ui`         | shadcn/ui component library                   |
| `@lore/db`         | `packages/db`         | Drizzle ORM + Neon serverless                 |
| `@lore/ai`         | `packages/ai`         | Vercel AI SDK + Ollama (OpenAI-compatible) wrappers |
| `@lore/auth`       | `packages/auth`       | Better-Auth config + helpers                  |
| `@lore/validators` | `packages/validators` | Shared Zod schemas                            |
| `@lore/utils`      | `packages/utils`      | Shared utils, routes, query keys, types       |
| `@lore/config`     | `packages/config`     | tsconfig, eslint, Tailwind base               |

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
