import { z } from "zod";
import { signGatewayToken } from "@lore/utils";
import { requirePro } from "@/lib/require-pro-route";
import { env } from "@/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectId: z.string().min(1),
  entityType: z.enum([
    "character",
    "location",
    "faction",
    "scene",
    "timeline_event",
  ]),
  fieldKey: z.string().min(1).max(64),
  fieldLabel: z.string().max(120).optional(),
  // Sibling-field values used to ground the generation. Bounded so a tampered
  // client can't push an unbounded prompt upstream.
  context: z.record(z.string(), z.string().max(4000)).optional(),
  locale: z.enum(["ar", "en"]).optional(),
});

// SSE-streamed on-demand field generation. Gates on an active Pro subscription
// (free users are short-circuited client-side, so a 402 here is defense in
// depth), then proxies to the Hono gateway, injecting the org id from the
// session — never trusting an org id from the browser.
export async function POST(req: Request): Promise<Response> {
  const gate = await requirePro();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 60);
  const payload = {
    ...parsed.data,
    orgId: gate.context.orgId,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_GATEWAY_URL}/agent/generate-field`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Gateway or agents server unreachable — surface as a single SSE error
    // event so the client's stream parser shows the inline "Try again" state
    // instead of hanging.
    const message = err instanceof Error ? err.message : String(err);
    const frame = `event: error\ndata: ${JSON.stringify({ message: `gateway unreachable: ${message}` })}\n\n`;
    return new Response(frame, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
      },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    const frame = `event: error\ndata: ${JSON.stringify({ message: text || `upstream ${upstream.status}` })}\n\n`;
    return new Response(frame, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
    },
  });
}
