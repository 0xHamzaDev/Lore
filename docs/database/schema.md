# Database Schema

## Stack

| Concern | Tool |
|---|---|
| ORM | Drizzle ORM |
| Database | PostgreSQL (Supabase) |
| Migrations | `drizzle-kit` |
| Validation | Zod (schemas derived from Drizzle) |

## Location

All schema lives in `packages/db/src/schema/`.

```
packages/db/
  src/
    schema/
      auth.ts          # users, sessions, accounts (Better-Auth managed)
      orgs.ts          # organizations, memberships
      billing.ts       # subscriptions, plans, usage
      projects.ts      # core product entity
      ai-runs.ts       # AI job records + token usage
      index.ts         # re-exports all tables
    client.ts          # Drizzle client singleton
    migrate.ts         # migration runner
  drizzle.config.ts
  migrations/          # generated SQL files — do not edit manually
```

## Conventions

### IDs

Use `cuid2` for all primary keys — short, sortable, URL-safe.

```ts
import { createId } from "@paralleldrive/cuid2"

id: text("id").primaryKey().$defaultFn(() => createId())
```

Never use `serial` / auto-increment integers for user-facing IDs.

### Timestamps

Every table has `createdAt` and `updatedAt`:

```ts
import { sql } from "drizzle-orm"

createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().notNull()
  .$onUpdateFn(() => new Date()),
```

### Soft Deletes

Use `deletedAt` instead of `DELETE` for any entity the user might want recovered:

```ts
deletedAt: timestamp("deleted_at"),
```

Filter in queries:

```ts
where: and(eq(projects.orgId, orgId), isNull(projects.deletedAt))
```

### Naming

- Table names: `snake_case` plural (`projects`, `ai_runs`)
- Column names: `snake_case` (`created_at`, `org_id`)
- TypeScript names: `camelCase` via Drizzle's `.$type<>()` or column alias

## Core Tables

### `users`

Managed by Better-Auth. Do not add application columns here directly — use a `user_profiles` table joined by `userId`.

```ts
// Extend user data here
export const userProfiles = pgTable("user_profiles", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  userId:      text("user_id").notNull().unique()
               .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl:   text("avatar_url"),
  locale:      text("locale").default("ar"),  // ar | en
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
})
```

### `organizations`

Multi-tenant anchor. Every row in the product is scoped to an `orgId`.

```ts
export const organizations = pgTable("organizations", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  planId:    text("plan_id").references(() => plans.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
})

export const memberships = pgTable("memberships", {
  id:     text("id").primaryKey().$defaultFn(() => createId()),
  orgId:  text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:   text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.orgId, t.userId),
}))
```

### `projects`

Primary product entity. Adapt fields to your domain.

```ts
export const projects = pgTable("projects", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  orgId:       text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdById: text("created_by_id").references(() => users.id),
  name:        text("name").notNull(),
  description: text("description"),
  status:      text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  metadata:    jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
  deletedAt:   timestamp("deleted_at"),
})
```

### `ai_runs`

Track every AI operation for billing, debugging, and usage dashboards.

```ts
export const aiRuns = pgTable("ai_runs", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  orgId:        text("org_id").notNull().references(() => organizations.id),
  projectId:    text("project_id").references(() => projects.id),
  userId:       text("user_id").references(() => users.id),
  model:        text("model").notNull(),           // e.g. "claude-sonnet-4-20250514"
  inputTokens:  integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs:    integer("latency_ms"),
  status:       text("status", { enum: ["success", "error", "cancelled"] }).notNull(),
  error:        text("error"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
})
```

## Drizzle Relations

Define relations in the schema file for type-safe joins:

```ts
export const projectsRelations = relations(projects, ({ one, many }) => ({
  org:       one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  createdBy: one(users,         { fields: [projects.createdById], references: [users.id] }),
  aiRuns:    many(aiRuns),
}))
```

## Type Exports

Export inferred types for use across the monorepo:

```ts
// packages/db/src/schema/projects.ts
export type Project        = typeof projects.$inferSelect
export type NewProject     = typeof projects.$inferInsert
export type ProjectStatus  = Project["status"]
```

## Migrations

```bash
# Generate migration after schema change
pnpm --filter @packages/db db:generate

# Apply migrations (dev)
pnpm --filter @packages/db db:migrate

# Push schema directly to dev DB (no migration file)
pnpm --filter @packages/db db:push

# Open Drizzle Studio
pnpm --filter @packages/db db:studio
```

Never edit files in `migrations/` manually. Always regenerate via `db:generate`.

## Zod Schemas

Derive Zod schemas from Drizzle types with `drizzle-zod`:

```ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod"

export const insertProjectSchema = createInsertSchema(projects, {
  name: (s) => s.min(1).max(100),
})

export const selectProjectSchema = createSelectSchema(projects)
```

Use `insertProjectSchema` to validate Server Action inputs.
