import { createId } from "@paralleldrive/cuid2";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { aiRuns } from "./ai";
import { organizations } from "./orgs";
import { projects, branches } from "./projects";

// Background-agent findings. Each row is a single piece of feedback an agent
// produced about an entity (or the project as a whole when entity_id is null).
// Dedup key: (project_id, branch_id, agent_type, entity_id, message).
//
// Lifecycle: 'open' → 'resolved' (sweep when a run no longer surfaces it) OR
// 'dismissed' (user clicked Dismiss). 'dismissed' is sticky — agents never
// reopen it. The ai_run_id FK is set null on delete so the row survives the
// run row's eventual cleanup; the audit trail just loses one indirection.
export const agentFindings = pgTable(
  "agent_findings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),

    agentType: text("agent_type", {
      enum: ["continuity", "pacing", "dialogue", "verification"],
    }).notNull(),

    // null = project-wide finding (e.g. pacing flagging an act-2 slump).
    entityId: text("entity_id"),
    entityType: text("entity_type", {
      enum: ["character", "location", "faction", "scene", "timeline_event"],
    }),

    severity: text("severity", {
      enum: ["error", "warning", "info"],
    }).notNull(),
    message: text("message").notNull(),

    status: text("status", { enum: ["open", "resolved", "dismissed"] })
      .notNull()
      .default("open"),
    resolvedAt: timestamp("resolved_at"),

    // Audit link to the model call that produced (or last touched) this row.
    aiRunId: text("ai_run_id").references(() => aiRuns.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Sidebar + severity-dot fetch query.
    byProjectStatus: index("agent_findings_project_branch_status_idx").on(
      t.projectId,
      t.branchId,
      t.status,
    ),
    // Resolution sweep query (scoped to one agent_type at a time).
    byProjectAgent: index("agent_findings_project_branch_agent_idx").on(
      t.projectId,
      t.branchId,
      t.agentType,
    ),
  }),
);

export type AgentFinding = typeof agentFindings.$inferSelect;
export type NewAgentFinding = typeof agentFindings.$inferInsert;
export type AgentFindingSeverity = AgentFinding["severity"];
export type AgentFindingStatus = AgentFinding["status"];
export type AgentType = AgentFinding["agentType"];
