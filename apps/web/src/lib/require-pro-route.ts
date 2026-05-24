import { headers } from "next/headers";
import { auth } from "@lore/auth";
import { requireSubscription } from "@lore/auth/subscription";

export type ProRouteContext = {
  userId: string;
  orgId: string;
};

export type ProRouteCheck =
  | { ok: true; context: ProRouteContext }
  | { ok: false; response: Response };

// Gate for AI route handlers. Resolves the user's active org, checks the
// subscription, and returns either the org context (on pass) or a Response the
// route should return verbatim (on fail). Keeps auth + subscription wiring in
// one place so every Phase 7-9 AI route is one import + one guard.
export async function requirePro(): Promise<ProRouteCheck> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) {
    return {
      ok: false,
      response: Response.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  const orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    return {
      ok: false,
      response: Response.json({ error: "no_active_org" }, { status: 400 }),
    };
  }

  const sub = await requireSubscription(orgId);
  if (!sub.allowed) {
    return {
      ok: false,
      response: Response.json(
        { error: "upgrade_required", plan: sub.plan },
        { status: 402 }, // Payment Required
      ),
    };
  }

  return { ok: true, context: { userId: session.user.id, orgId } };
}
