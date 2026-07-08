# Query Pattern

## Philosophy

- **Server Components** are the default. Fetch data directly in RSC — no `useEffect`, no client-side loading spinners for initial data.
- **TanStack Query** is used for client-side mutations, optimistic updates, and real-time-feeling interactions.
- **Server Actions** handle all mutations (create, update, delete). Never call a raw API route for mutations from the client.

## Stack

| Concern                         | Tool                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Server-side reads               | `async` Server Components + Drizzle                  |
| Client-side reads (when needed) | TanStack Query v5                                    |
| Mutations                       | Server Actions + TanStack Query `useMutation`        |
| AI streaming                    | Vercel AI SDK `useChat` / `useCompletion`            |
| Cache invalidation              | `revalidatePath` / `revalidateTag` in Server Actions |

## Pattern 1 — RSC Direct Fetch (Default)

Use for all initial page data. Drizzle query runs on the server; no API round-trip.

```tsx
// app/[locale]/(dashboard)/projects/page.tsx
import { db } from "@packages/db";
import { projects } from "@packages/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@packages/auth";

export default async function ProjectsPage() {
  const session = await auth();

  const rows = await db.query.projects.findMany({
    where: eq(projects.orgId, session.orgId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  });

  return <ProjectList projects={rows} />;
}
```

## Pattern 2 — Suspense + Skeleton

Wrap slow RSC fetches in `<Suspense>` to stream the shell immediately.

```tsx
// page.tsx
import { Suspense } from "react";
import { ProjectListSkeleton } from "./_components/project-list-skeleton";
import { ProjectList } from "./_components/project-list";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectList /> {/* async RSC inside */}
    </Suspense>
  );
}
```

## Pattern 3 — TanStack Query (Client Interactive)

Use when the user triggers re-fetches, or when data must stay fresh after mutations without a full navigation.

```tsx
// _hooks/use-projects.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { getProjectsAction } from "../_actions";

export function useProjects(orgId: string) {
  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => getProjectsAction(orgId),
  });
}
```

Query keys live in `packages/utils/src/query-keys.ts` — never inline them.

```ts
// packages/utils/src/query-keys.ts
export const QK = {
  projects: {
    list: (orgId: string) => ["projects", orgId] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  usage: (orgId: string) => ["usage", orgId] as const,
};
```

## Pattern 4 — Server Action Mutation

```tsx
// _actions.ts
"use server";
import { db } from "@packages/db";
import { projects } from "@packages/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@packages/auth";
import { z } from "zod";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function createProjectAction(
  input: z.infer<typeof CreateProjectSchema>,
) {
  const session = await auth();
  const data = CreateProjectSchema.parse(input);

  const [project] = await db
    .insert(projects)
    .values({
      ...data,
      orgId: session.orgId,
      createdById: session.userId,
    })
    .returning();

  revalidatePath("/projects");
  return { project };
}
```

Client usage with TanStack:

```tsx
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProjectAction } from "../_actions";
import { QK } from "@packages/utils/query-keys";

export function useCreateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createProjectAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects.list(orgId) });
    },
  });
}
```

## Pattern 5 — AI Streaming

```tsx
"use client"
import { useChat } from "ai/react"

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  })

  return (/* ... */)
}
```

Server route at `app/api/chat/route.ts` uses `packages/ai` wrappers around the Vercel AI SDK.

## Error Handling

Server Actions return a typed result union — never `throw` to the client:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

On the client, check `result.success` before accessing `result.data`.

## Caching

| Strategy                    | When                                       |
| --------------------------- | ------------------------------------------ |
| `cache: "no-store"`         | Authenticated pages — user-specific data   |
| `revalidate: 3600`          | Public marketing pages                     |
| `revalidateTag("projects")` | After mutations that affect project lists  |
| TanStack `staleTime`        | Set per-query; default `1000 * 60` (1 min) |
