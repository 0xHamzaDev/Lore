import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { runAgent, type AgentRunInput } from "./run-agent";
import { runGenerateFieldStream, type GenerateFieldPayload } from "./generate-field";
import { logAiRun } from "./logger";

const PORT = Number(process.env["PORT"] ?? 4000);
const INTERNAL_AGENT_TOKEN = process.env["INTERNAL_AGENT_TOKEN"];

// Serialize one Server-Sent Event frame.
function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Streaming counterpart to /internal/agent-run. Streams model output as SSE,
// then logs a single ai_runs row once the stream finishes (success or error)
// and emits a final `done` event carrying the row id so the browser's Accept
// flow can flag the run as kept.
async function handleAgentStream(
  payload: GenerateFieldPayload,
  res: ServerResponse,
): Promise<void> {
  const orgId = payload.orgId ?? null;
  const projectId = payload.projectId ?? null;
  const start = Date.now();

  const { stream, done, model } = runGenerateFieldStream(payload);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });

  // Pump model text deltas to the client as they arrive.
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      const text = decoder.decode(value);
      if (text) res.write(sseFrame("delta", { text }));
    }
  } catch {
    // A read error means the `done` promise below rejects too — handle it there.
  }

  try {
    const meta = await done;
    const aiRunId = await logAiRun({
      orgId,
      projectId,
      runType: "on_demand",
      model,
      inputTokens: meta.usage.inputTokens,
      outputTokens: meta.usage.outputTokens,
      latencyMs: meta.latencyMs,
      status: "success",
      accepted: false,
    });
    res.write(sseFrame("done", { aiRunId, usage: meta.usage, latencyMs: meta.latencyMs, model }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logAiRun({
      orgId,
      projectId,
      runType: "on_demand",
      model,
      latencyMs: Date.now() - start,
      status: "error",
      errorMessage: message,
      accepted: false,
    });
    res.write(sseFrame("error", { message }));
  }
  res.end();
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // Reject oversized bodies rather than buffering unboundedly.
      if (raw.length > 1_000_000) reject(new Error("request body too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  void (async () => {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { status: "ok", service: "lore-agents" });
      return;
    }

    if (req.method === "POST" && req.url === "/internal/agent-run") {
      // Token gate — the API gateway is the only intended caller.
      const token = req.headers["x-internal-token"];
      if (!INTERNAL_AGENT_TOKEN || token !== INTERNAL_AGENT_TOKEN) {
        sendJson(res, 401, { success: false, error: "unauthorized" });
        return;
      }

      try {
        const body = (await readJsonBody(req)) as AgentRunInput;
        if (!body || typeof body.type !== "string") {
          sendJson(res, 400, { success: false, error: "missing agent type" });
          return;
        }
        const data = await runAgent(body);
        sendJson(res, 200, { success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[agents] agent-run failed", message);
        sendJson(res, 500, { success: false, error: message });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/internal/agent-stream") {
      const token = req.headers["x-internal-token"];
      if (!INTERNAL_AGENT_TOKEN || token !== INTERNAL_AGENT_TOKEN) {
        sendJson(res, 401, { success: false, error: "unauthorized" });
        return;
      }

      let body: AgentRunInput;
      try {
        body = (await readJsonBody(req)) as AgentRunInput;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 400, { success: false, error: message });
        return;
      }
      // Only field generation streams today; wizard/command streaming land in
      // Phases 8-9. Reject other types before opening the SSE response so the
      // caller gets a clean JSON error, not a half-open stream.
      if (!body || body.type !== "generate-field") {
        sendJson(res, 400, { success: false, error: "unsupported stream type" });
        return;
      }
      // handleAgentStream owns the response from here (headers + end), and
      // never throws — failures are emitted as an SSE `error` event.
      await handleAgentStream((body.payload ?? {}) as GenerateFieldPayload, res);
      return;
    }

    sendJson(res, 404, { success: false, error: "not found" });
  })();
});

server.listen(PORT, () => {
  console.log(`[agents] listening on http://localhost:${PORT}`);
  if (!INTERNAL_AGENT_TOKEN) {
    console.warn("[agents] INTERNAL_AGENT_TOKEN is not set — all /internal requests will 401");
  }
});
