# Feature Module

## Philosophy

Each product feature is a self-contained vertical slice. All code related to a feature lives together under its route folder, not spread across a global `components/` or `hooks/` directory.

## Anatomy of a Feature

```
app/[locale]/(dashboard)/projects/
  page.tsx                    # RSC entry — fetches data, renders shell
  loading.tsx                 # Route-level skeleton
  error.tsx                   # Route-level error boundary

  [id]/
    page.tsx                  # Detail page
    settings/
      page.tsx

  _actions.ts                 # All Server Actions for this feature
  _queries.ts                 # (optional) query helpers not in packages/db

  _components/
    project-list.tsx          # List component (may be async RSC)
    project-list-skeleton.tsx
    project-card.tsx
    create-project-dialog.tsx
    create-project-form.tsx

  _hooks/
    use-create-project.ts     # useMutation wrapper
    use-project-filters.ts    # local UI state

  types.ts                    # (optional) feature-local types not from DB
```

## Step-by-Step: Adding a Feature End-to-End

### 1. Define the Schema

Add or modify tables in `packages/db/src/schema/`. Follow [database/schema.md](../database/schema.md).

```bash
pnpm --filter @packages/db db:generate
pnpm --filter @packages/db db:migrate
```

### 2. Create Query Functions

If the query is reused across features, add it to `packages/db/src/queries/`. If feature-only, put it in `_queries.ts`.

```ts
// packages/db/src/queries/projects.ts
export async function getProjectsByOrg(orgId: string) { ... }
```

### 3. Create the Route File

```
app/[locale]/(dashboard)/projects/page.tsx
```

Start with the RSC page fetching data directly:

```tsx
export default async function ProjectsPage() {
  const session = await auth();
  const rows = await getProjectsByOrg(session.orgId);
  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8">
      <PageHeader title="Projects" action={<CreateProjectButton />} />
      <ProjectList projects={rows} />
    </div>
  );
}
```

### 4. Build UI Components

In `_components/`. Keep components small and single-purpose.

- `project-list.tsx` — renders the list
- `project-card.tsx` — single card
- `create-project-dialog.tsx` — dialog shell
- `create-project-form.tsx` — controlled form with `react-hook-form` + Zod

```tsx
// _components/create-project-form.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@packages/db/schema/projects";
import { useCreateProject } from "../_hooks/use-create-project";

export function CreateProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm({ resolver: zodResolver(insertProjectSchema) });
  const { mutate, isPending } = useCreateProject();

  return (
    <form onSubmit={form.handleSubmit((data) => mutate(data, { onSuccess }))}>
      {/* fields */}
    </form>
  );
}
```

### 5. Write Server Actions

In `_actions.ts`. See [server/server-functions.md](../server/server-functions.md) for the canonical shape.

```ts
export async function createProjectAction(input: unknown): Promise<ActionResult<Project>> { ... }
export async function updateProjectAction(id: string, input: unknown): Promise<ActionResult<Project>> { ... }
export async function deleteProjectAction(id: string): Promise<ActionResult<void>> { ... }
```

### 6. Create TanStack Mutation Hooks

In `_hooks/`. Wrap the Server Action and handle cache invalidation.

```ts
// _hooks/use-create-project.ts
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QK } from "@packages/utils/query-keys";
import { createProjectAction } from "../_actions";

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProjectAction,
    onSuccess: (result) => {
      if (result.success) qc.invalidateQueries({ queryKey: QK.projects.list });
    },
  });
}
```

### 7. Add Navigation

Add the route to `apps/web/config/nav.ts`:

```ts
{ label: "Projects", href: ROUTES.projects.list, icon: FolderIcon }
```

### 8. AI Integration (if applicable)

If the feature uses AI, use the wrappers in `packages/ai/`:

```ts
// packages/ai/src/run.ts
export async function runAI(opts: AIRunOptions): Promise<AIRunResult> {
  // wraps Vercel AI SDK, logs to ai_runs table
}
```

Always log to `ai_runs` for usage tracking.

## Feature Checklist

Before marking a feature complete:

- [ ] Schema migrated and types exported
- [ ] Server Actions validate input with Zod
- [ ] Server Actions check auth and org membership
- [ ] Empty state component exists
- [ ] Loading skeleton exists
- [ ] Error boundary (`error.tsx`) in place
- [ ] Route added to `nav.ts`
- [ ] Arabic translations added to `messages/ar.json`
- [ ] English translations added to `messages/en.json`
- [ ] RTL layout tested (flip to `ar` locale)
- [ ] AI usage logged to `ai_runs` (if applicable)

## Shared vs Feature-Local

| Code                      | Location                                       |
| ------------------------- | ---------------------------------------------- |
| Reused across 2+ features | `packages/ui` or `packages/utils`              |
| Reused within one feature | `_components/` or `_hooks/`                    |
| One-off for a single page | Inline in `page.tsx` or a small colocated file |

Avoid premature abstraction — only move to `packages/` when the second feature needs it.
