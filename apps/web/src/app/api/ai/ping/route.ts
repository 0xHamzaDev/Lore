import { runAgent } from "@lore/agents";

export const runtime = "nodejs";

// Health check that exercises the full AI path in-process (Next → Ollama),
// via the same ping agent the gateway used to forward to. Open (no user auth)
// so it can be curled directly. Response shape matches the old gateway
// passthrough: { success: true, data } or { success: false, error }.
async function handlePing(): Promise<Response> {
  try {
    const data = await runAgent({ type: "ping" });
    return Response.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  return handlePing();
}

export async function POST(): Promise<Response> {
  return handlePing();
}
