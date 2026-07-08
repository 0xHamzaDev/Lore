import { createHmac, timingSafeEqual } from "node:crypto";
import { db, subscriptions, eq } from "@lore/db";
import { env } from "@/env";

// Moyasar webhook receiver. Stub-mode safe: if MOYASAR_WEBHOOK_SECRET isn't
// set, the route 503s so we never accept unverified writes.
//
// Real Moyasar webhooks send an `X-Moyasar-Signature` header containing an
// HMAC-SHA256 of the raw body. We verify with timingSafeEqual and then upsert
// the subscription idempotently. The handler is the source of truth for
// subscription state in production; the stub checkout action is dev-only.
//
// Expected event shapes (subset):
//   payment.paid        → upsert active, period_end = now + 30d
//   subscription.created → upsert active, period_end from payload
//   subscription.cancelled → mark cancelled, keep period_end
//   subscription.failed → mark past_due

const PRO_PERIOD_DAYS = 30;

type MoyasarEvent = {
  type?: string;
  data?: {
    metadata?: { org_id?: string };
    subscription_id?: string;
    current_period_end?: string;
  };
};

export async function POST(request: Request): Promise<Response> {
  if (!env.MOYASAR_WEBHOOK_SECRET) {
    return Response.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-moyasar-signature");
  if (!signature) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha256", env.MOYASAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: MoyasarEvent;
  try {
    event = JSON.parse(rawBody) as MoyasarEvent;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const orgId = event.data?.metadata?.org_id;
  if (!orgId) {
    return Response.json({ error: "missing_org_id" }, { status: 400 });
  }

  const periodEnd = event.data?.current_period_end
    ? new Date(event.data.current_period_end)
    : defaultPeriodEnd();

  try {
    switch (event.type) {
      case "payment.paid":
      case "subscription.created":
      case "subscription.renewed":
        await db
          .insert(subscriptions)
          .values({
            orgId,
            plan: "pro",
            status: "active",
            moyasarSubscriptionId: event.data?.subscription_id ?? null,
            currentPeriodEnd: periodEnd,
          })
          .onConflictDoUpdate({
            target: subscriptions.orgId,
            set: {
              plan: "pro",
              status: "active",
              moyasarSubscriptionId: event.data?.subscription_id ?? null,
              currentPeriodEnd: periodEnd,
              updatedAt: new Date(),
            },
          });
        break;

      case "subscription.cancelled":
        await db
          .update(subscriptions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(subscriptions.orgId, orgId));
        break;

      case "payment.failed":
      case "subscription.past_due":
        await db
          .update(subscriptions)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(subscriptions.orgId, orgId));
        break;

      default:
        return Response.json(
          { ok: true, ignored: event.type },
          { status: 200 },
        );
    }
  } catch (err) {
    console.error("[moyasar webhook]", err);
    return Response.json({ error: "db_write_failed" }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}

function defaultPeriodEnd(): Date {
  const d = new Date();
  d.setDate(d.getDate() + PRO_PERIOD_DAYS);
  return d;
}
