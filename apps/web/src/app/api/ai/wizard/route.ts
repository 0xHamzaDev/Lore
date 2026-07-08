import { z } from "zod";
import { signGatewayToken } from "@lore/utils";
import { requirePro } from "@/lib/require-pro-route";
import { env } from "@/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  projectId: z.string().min(1),
  brief: z.string().min(1).max(2000),
  locale: z.enum(["ar", "en"]).optional(),
});

function sseError(message: string): Response {
  const frame = `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
  return new Response(frame, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
    },
  });
}

// SSE-streamed wizard generation. Pro-gated (free users are short-circuited
// client-side; a 402 here is defense in depth), then proxies to the Hono gateway
// injecting orgId from the session — never trusting an org id from the browser.
export async function POST(req: Request): Promise<Response> {
  const gate = await requirePro();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 120);
  const payload = { ...parsed.data, orgId: gate.context.orgId };

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_GATEWAY_URL}/agent/wizard`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sseError(`gateway unreachable: ${message}`);
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return sseError(text || `upstream ${upstream.status}`);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
    },
  });
}
