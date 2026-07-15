import { signGatewayToken } from "@lore/utils";
import { env } from "@/env";

// Server-side POST to the Hono gateway's /agent/run-background route. Mints
// a short HMAC token (the gateway verifies it via the shared API_GATEWAY_SECRET).
// The browser never reaches this code path — only the Inngest function does.
// Unlike the on-demand AI routes, background agent runs haven't been migrated
// off the gateway yet, so this still needs API_GATEWAY_URL/SECRET — both
// optional now that the on-demand routes don't require them.
export async function callAgentsBackground(input: {
  orgId: string;
  projectId: string;
  branchId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!env.API_GATEWAY_URL || !env.API_GATEWAY_SECRET) {
    return { success: false, error: "API_GATEWAY_URL/SECRET not configured" };
  }
  const token = await signGatewayToken(env.API_GATEWAY_SECRET, 120);
  const upstream = await fetch(`${env.API_GATEWAY_URL}/agent/run-background`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!upstream.ok) {
    const text = await upstream.text();
    return {
      success: false,
      error: `gateway ${upstream.status}: ${text.slice(0, 200)}`,
    };
  }
  return { success: true };
}
