# Server Functions

## Overview

All data mutations and privileged reads are performed through **Server Actions**. API route handlers (`route.ts`) are reserved for webhooks, third-party callbacks, and streaming endpoints.

## Server Actions

### Rules

1. Always `"use server"` at the top of the file or per function.
2. Always authenticate before touching the database — call `auth()` first.
3. Always validate input with the Zod schema derived from Drizzle.
4. Return a typed result union — never throw to the client.
5. Call `revalidatePath` or `revalidateTag` after mutations.
6. Keep actions colocated with their feature: `app/[locale]/(dashboard)/[feature]/_actions.ts`.

### Canonical Shape

```ts
// _actions.ts
"use server"

import { db } from "@packages/db"
import { projects } from "@packages/db/schema"
import { insertProjectSchema } from "@packages/db/schema/projects"
import { auth } from "@packages/auth"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@packages/utils/types"

export async function createProjectAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    const data = insertProjectSchema.parse(input)

    const [project] = await db
      .insert(projects)
      .values({ ...data, orgId: session.orgId, createdById: session.userId })
      .returning({ id: projects.id })

    revalidatePath("/projects")
    return { success: true, data: { id: project.id } }
  } catch (err) {
    console.error("[createProjectAction]", err)
    return { success: false, error: "Failed to create project." }
  }
}
```

### Result Type

```ts
// packages/utils/src/types.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

### Auth Guard Helper

```ts
// packages/auth/src/guard.ts
import { auth } from "."
import type { Session } from "."

export async function requireAuth(): Promise<Session> {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  return session
}
```

Use `requireAuth()` inside actions to reduce boilerplate:

```ts
const session = await requireAuth()
```

### Permission Check

```ts
// packages/auth/src/permissions.ts
export async function requireRole(orgId: string, minRole: "member" | "admin" | "owner") {
  const session = await requireAuth()
  const membership = await getMembership(session.userId, orgId)
  if (!hasRole(membership.role, minRole)) {
    throw new Error("Insufficient permissions")
  }
  return session
}
```

## API Route Handlers

Use `route.ts` only for:
- Webhook receivers (Stripe, Clerk, etc.)
- OAuth callbacks
- AI streaming endpoints
- Public REST endpoints consumed by third parties

```ts
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get("stripe-signature") ?? ""
  // ... verify + handle
  return NextResponse.json({ received: true })
}
```

### AI Streaming Route

```ts
// app/api/chat/route.ts
import { streamText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { auth } from "@packages/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { messages } = await req.json()

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: "You are a helpful assistant.",
    messages,
  })

  return result.toDataStreamResponse()
}
```

## Shared Query Functions

For reads shared across multiple Server Actions or RSC pages, define query functions in `packages/db/src/queries/`:

```ts
// packages/db/src/queries/projects.ts
import { db } from "../client"
import { projects } from "../schema"
import { and, eq, isNull } from "drizzle-orm"

export async function getProjectsByOrg(orgId: string) {
  return db.query.projects.findMany({
    where: and(eq(projects.orgId, orgId), isNull(projects.deletedAt)),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })
}
```

Import directly in RSC pages or inside Server Actions.

## Error Handling Pattern

```ts
// packages/utils/src/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION" | "INTERNAL"
  ) {
    super(message)
  }
}
```

Catch `AppError` in actions and map to user-friendly messages. Let unknown errors log to the server and return a generic message to the client.

## Logging

Use structured logging in all server functions:

```ts
console.error("[actionName]", { orgId, userId, error: err })
```

Format: `[functionName] { contextKeys }`. Never log PII (email, full names, tokens).
