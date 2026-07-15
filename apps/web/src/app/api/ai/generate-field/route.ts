import { runGenerateFieldStream } from "@lore/agents";
import { z } from "zod";
import { createDeltaSseResponse, sseErrorResponse } from "@/lib/agent-sse";
import { requirePro } from "@/lib/require-pro-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1),
  entityType: z.enum(["character", "location", "faction", "scene", "timeline_event"]),
  fieldKey: z.string().min(1).max(64),
  fieldLabel: z.string().max(120).optional(),
  // Sibling-field values used to ground the generation. Bounded so a tampered
  // client can't push an unbounded prompt upstream.
  context: z.record(z.string(), z.string().max(4000)).optional(),
  locale: z.enum(["ar", "en"]).optional(),
});

// SSE-streamed on-demand field generation. Gates on an active Pro subscription
// (free users are short-circuited client-side, so a 402 here is defense in
// depth), then runs the model in-process, injecting the org id from the
// session — never trusting an org id from the browser.
export async function POST(req: Request): Promise<Response> {
  const gate = await requirePro();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = {
    ...parsed.data,
    orgId: gate.context.orgId,
  };

  let result: ReturnType<typeof runGenerateFieldStream>;
  try {
    result = runGenerateFieldStream(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sseErrorResponse(message);
  }

  return createDeltaSseResponse(result, {
    orgId: gate.context.orgId,
    projectId: parsed.data.projectId,
    runType: "on_demand",
    includeAiRunId: true,
  });
}
