import { db, aiRuns, type NewAiRun } from "@lore/db";

// Single sink for the ai_runs observability/billing log. Every model call —
// success or failure — should funnel through here so no AI usage is silent.
// Returns the inserted row id so callers (e.g. the on-demand streaming handler)
// can hand it back to the client for the Accept flow to flag later. Returns
// null if the insert failed — a logging failure must never mask the agent
// result, so we swallow it here and surface it in the server logs.
export async function logAiRun(row: NewAiRun): Promise<string | null> {
  try {
    const [inserted] = await db
      .insert(aiRuns)
      .values(row)
      .returning({ id: aiRuns.id });
    return inserted?.id ?? null;
  } catch (err) {
    console.error("[agents] failed to write ai_runs row", err);
    return null;
  }
}
