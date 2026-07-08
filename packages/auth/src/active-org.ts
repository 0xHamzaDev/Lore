import { createId } from "@paralleldrive/cuid2";
import { db, organizations, members, and, eq } from "@lore/db";

type SessionUser = { id: string; name?: string | null; email: string };

/**
 * Resolve the organization an authenticated user should act under.
 *
 * Order: the session's active org → the user's first membership → a personal
 * org (adopted if one already exists for this user, otherwise created). The
 * last step self-heals accounts that ended up with no membership — e.g. the
 * sign-up `user.create.after` hook created the org but failed before inserting
 * the member row, or the only org was deleted.
 *
 * This must NEVER return null for an authenticated user: callers used to
 * `redirect("/sign-in")` on a missing org, which the middleware bounces
 * straight back to `/dashboard` (session cookie present) — an infinite
 * redirect loop that renders as a page that "loads forever" / spams requests.
 *
 * It must also be idempotent: the personal-org slug is deterministic
 * (`personal-<userId>`), so a blind insert collides with the unique slug index
 * when an orphan org already exists. We look the org up first and only insert
 * what's missing (org, then membership).
 */
export async function resolveActiveOrgId(
  user: SessionUser,
  activeOrganizationId?: string | null,
): Promise<string> {
  if (activeOrganizationId) return activeOrganizationId;

  const [membership] = await db
    .select({ organizationId: members.organizationId })
    .from(members)
    .where(eq(members.userId, user.id))
    .limit(1);
  if (membership) return membership.organizationId;

  // No membership. Find or create this user's personal org, then ensure a
  // membership links them to it. neon-http has no transactions, so each step is
  // sequential and individually idempotent.
  const slug = `personal-${user.id}`;

  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  let orgId: string;
  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    orgId = createId();
    await db.insert(organizations).values({
      id: orgId,
      name: user.name ?? user.email.split("@")[0] ?? "My Organization",
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Adopt the org: guarantee the user is a member (owner) of it.
  const [existingMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, user.id), eq(members.organizationId, orgId)))
    .limit(1);
  if (!existingMember) {
    await db.insert(members).values({
      id: createId(),
      organizationId: orgId,
      userId: user.id,
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return orgId;
}
