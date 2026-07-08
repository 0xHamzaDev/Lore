import { db, eq, members, organizations, users } from "@lore/db";
import { createId } from "@paralleldrive/cuid2";

/**
 * Ensure the user has a personal organization and return its id.
 *
 * Idempotent: returns the first existing membership's org, or creates a personal
 * org + owner membership if the user has none. Shared by the `session.create.before`
 * auth hook (so every session gets an `activeOrganizationId`) and the dashboard
 * (so a signed-in user with no resolvable org self-heals instead of being bounced
 * to `/sign-in` — which the middleware immediately redirects back to `/dashboard`,
 * an infinite redirect loop).
 */
export async function ensurePersonalOrg(userId: string): Promise<string> {
  const [membership] = await db
    .select({ organizationId: members.organizationId })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);

  if (membership) return membership.organizationId;

  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const orgId = createId();
  const now = new Date();
  await db.insert(organizations).values({
    id: orgId,
    name: user?.name ?? user?.email?.split("@")[0] ?? "My Organization",
    slug: `personal-${userId}`,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(members).values({
    id: createId(),
    organizationId: orgId,
    userId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });

  return orgId;
}
