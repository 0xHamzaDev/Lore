import { signGatewayToken } from "@lore/utils";
import { env } from "@/env";

// Health check that round-trips Next → Hono gateway → agents server → Anthropic.
// Open (no user auth) so it can be curled directly; it still mints a signed
// gateway token because the Hono layer rejects unsigned requests.
async function handlePing(): Promise<Response> {
  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 60);

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_GATEWAY_URL}/agent/ping`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { success: false, error: `gateway unreachable: ${message}` },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(): Promise<Response> {
  return handlePing();
}

export async function POST(): Promise<Response> {
  return handlePing();
}
