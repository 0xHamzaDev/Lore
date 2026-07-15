import { runWizardStream } from "@lore/agents";
import { z } from "zod";
import { createWizardSseResponse, sseErrorResponse } from "@/lib/agent-sse";
import { requirePro } from "@/lib/require-pro-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1),
  brief: z.string().min(1).max(2000),
  locale: z.enum(["ar", "en"]).optional(),
});

// SSE-streamed wizard generation. Pro-gated (free users are short-circuited
// client-side; a 402 here is defense in depth), then runs the model in-process
// injecting orgId from the session — never trusting an org id from the browser.
export async function POST(req: Request): Promise<Response> {
  const gate = await requirePro();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = { ...parsed.data, orgId: gate.context.orgId };

  let result: ReturnType<typeof runWizardStream>;
  try {
    result = runWizardStream(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sseErrorResponse(message);
  }

  return createWizardSseResponse(result, {
    orgId: gate.context.orgId,
    projectId: parsed.data.projectId,
  });
}
