import { createId } from "@paralleldrive/cuid2";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./orgs";
import { projects, branches } from "./projects";

export const characters = pgTable("characters", {
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
  name: text("name").notNull(),
  bio: text("bio"),
  age: text("age"),
  role: text("role"),
  backstory: text("backstory"),
  voiceSample: text("voice_sample"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const locations = pgTable("locations", {
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
  name: text("name").notNull(),
  description: text("description"),
  climate: text("climate"),
  culture: text("culture"),
  history: text("history"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const factions = pgTable("factions", {
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
  name: text("name").notNull(),
  description: text("description"),
  ideology: text("ideology"),
  goals: text("goals"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const scenes = pgTable("scenes", {
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
  title: text("title").notNull(),
  summary: text("summary"),
  beat: text("beat"),
  sceneOrder: integer("scene_order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const timelineEvents = pgTable("timeline_events", {
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
  title: text("title").notNull(),
  description: text("description"),
  date: text("date"),
  significance: text("significance"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export type Character = typeof characters.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Faction = typeof factions.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;

export type EntityType = "character" | "location" | "faction" | "scene" | "timeline_event";

export type AnyEntity = Character | Location | Faction | Scene | TimelineEvent;
