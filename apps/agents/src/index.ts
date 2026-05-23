import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { runAgent, type AgentRunInput } from "./run-agent";

const PORT = Number(process.env["PORT"] ?? 4000);
const INTERNAL_AGENT_TOKEN = process.env["INTERNAL_AGENT_TOKEN"];

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

    sendJson(res, 404, { success: false, error: "not found" });
  })();
});

server.listen(PORT, () => {
  console.log(`[agents] listening on http://localhost:${PORT}`);
  if (!INTERNAL_AGENT_TOKEN) {
    console.warn("[agents] INTERNAL_AGENT_TOKEN is not set — all /internal requests will 401");
  }
});
