import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./orgs";
import { projects } from "./projects";

// Append-only observability + billing log for every model call. One row per
// run; orgId/projectId are nullable so system-level runs (e.g. the
// /api/ai/ping health check) can be logged without a project context, and set
// null on delete to preserve history.
export const aiRuns = pgTable("ai_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  orgId: text("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  runType: text("run_type", {
    enum: ["wizard", "on_demand", "command", "query", "agent"],
  }).notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  errorMessage: text("error_message"),
  // On-demand generations (Phase 7) always log a row for billing/observability,
  // but the user may discard the result. `accepted` lets billing distinguish a
  // generation the user kept from one they threw away. Flipped to true by the
  // Accept server action; null for run types where acceptance is meaningless
  // (ping, wizard, etc.).
  accepted: boolean("accepted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AiRun = typeof aiRuns.$inferSelect;
export type NewAiRun = typeof aiRuns.$inferInsert;
export type AiRunType = AiRun["runType"];
export type AiRunStatus = AiRun["status"];
