import { db, aiRuns, type NewAiRun } from "@lore/db";

// Single sink for the ai_runs observability/billing log. Every model call —
// success or failure — should funnel through here so no AI usage is silent.
export async function logAiRun(row: NewAiRun): Promise<void> {
  try {
    await db.insert(aiRuns).values(row);
  } catch (err) {
    // Never let a logging failure mask the underlying agent result; surface it
    // in the server logs instead.
    console.error("[agents] failed to write ai_runs row", err);
  }
}
