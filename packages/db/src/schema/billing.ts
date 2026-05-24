import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./orgs";

// One subscription row per org, inserted only when an org becomes pro. Absence
// of a row = free plan. `status='cancelled'` orgs retain access until
// `current_period_end`; the gate must check the date, not just the status.
export const subscriptions = pgTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  orgId: text("org_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("pro"),
  status: text("status", { enum: ["active", "cancelled", "past_due"] })
    .notNull()
    .default("active"),
  moyasarSubscriptionId: text("moyasar_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionPlan = Subscription["plan"];
export type SubscriptionStatus = Subscription["status"];
