import { requireSubscription } from "@lore/auth/subscription";
import { inngest } from "./client";
import { callAgentsBackground } from "@/lib/inngest/call-agents-background";

// Exported so tests can call the handler directly without an Inngest runtime.
// In production Inngest invokes the handler via its retry/debounce wrapper.
export async function _handler({
  event,
  step,
}: {
  event: { data: { orgId: string; projectId: string; branchId: string } };
  step: { run: <T>(name: string, fn: () => Promise<T>) => Promise<T> };
}): Promise<unknown> {
  const { orgId, projectId, branchId } = event.data;

  // Free orgs don't get background story checks (cost gate). The teaser in
  // the canvas sidebar is static — no live count to leak.
  const sub = await step.run("load-subscription", () =>
    requireSubscription(orgId),
  );
  if (!sub.allowed) return { skipped: "free_plan" };

  return step.run("call-agents", async () => {
    const result = await callAgentsBackground({ orgId, projectId, branchId });
    if (!result.success) {
      throw new Error(result.error ?? "agents background call failed");
    }
    return result;
  });
}

// inngest@4 moved the trigger into the config object (`triggers: [...]`) and
// dropped the separate trigger argument — `createFunction(config, handler)`.
export const runBackgroundAgents = inngest.createFunction(
  {
    id: "agents.run",
    triggers: [{ event: "entity.updated" }],
    // Coalesce bursts of edits into one run per project. 10s lines up with
    // the debounce window in the Phase 10 spec.
    debounce: { key: "event.data.projectId", period: "10s" },
    // Model timeouts shouldn't lose findings — retry up to 3x.
    retries: 3,
    // Stop a stampede across projects from drowning the agents server.
    concurrency: { limit: 8 },
  },
  _handler,
);
