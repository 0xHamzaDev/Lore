import { Hono, type Context } from "hono";
import { verifyGatewayToken } from "@lore/utils";

type Bindings = {
  API_GATEWAY_SECRET: string;
  AGENTS_SERVER_URL: string;
  INTERNAL_AGENT_TOKEN: string;
};

type AppContext = Context<{ Bindings: Bindings }>;

// Mirrors the agents server's handler names.
type AgentType = "ping" | "wizard" | "command" | "generate-field";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.json({ status: "ok", service: "lore-api" }));

// Verify the short-lived HMAC token minted by the Next.js route handlers.
// The browser never reaches this Worker directly — only the Next server does.
app.use("/agent/*", async (c, next) => {
  const auth = c.req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
  if (!token || !(await verifyGatewayToken(token, c.env.API_GATEWAY_SECRET))) {
    return c.json({ success: false, error: "unauthorized" }, 401);
  }
  await next();
});

// Forward a buffered agent request to the agents server, attaching the internal
// token. The request body becomes the agent `payload`.
async function forward(c: AppContext, type: AgentType): Promise<Response> {
  const payload = await c.req.json().catch(() => ({}));
  const upstream = await fetch(`${c.env.AGENTS_SERVER_URL}/internal/agent-run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": c.env.INTERNAL_AGENT_TOKEN,
    },
    body: JSON.stringify({ type, payload }),
  });
  // Pass the agents server's status through (e.g. 500 on a model error) so the
  // Next layer and the browser see the real outcome.
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

// Forward a streaming agent request. Pipes the agents server's SSE body straight
// through without buffering so model deltas reach the browser as they arrive.
async function forwardStream(c: AppContext, type: AgentType): Promise<Response> {
  const payload = await c.req.json().catch(() => ({}));
  const upstream = await fetch(`${c.env.AGENTS_SERVER_URL}/internal/agent-stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": c.env.INTERNAL_AGENT_TOKEN,
    },
    body: JSON.stringify({ type, payload }),
  });
  // A non-200 here is a pre-stream JSON error (bad type, auth) — pass it through
  // verbatim. Otherwise stream the SSE body.
  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
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

app.post("/agent/ping", (c) => forward(c, "ping"));
app.post("/agent/wizard", (c) => forward(c, "wizard"));
app.post("/agent/command", (c) => forward(c, "command"));
app.post("/agent/generate-field", (c) => forwardStream(c, "generate-field"));

export default app;
