CREATE TABLE "agent_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"agent_type" text NOT NULL,
	"entity_id" text,
	"entity_type" text,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"ai_run_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_findings" ADD CONSTRAINT "agent_findings_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_findings" ADD CONSTRAINT "agent_findings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_findings" ADD CONSTRAINT "agent_findings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_findings" ADD CONSTRAINT "agent_findings_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_findings_project_branch_status_idx" ON "agent_findings" USING btree ("project_id","branch_id","status");--> statement-breakpoint
CREATE INDEX "agent_findings_project_branch_agent_idx" ON "agent_findings" USING btree ("project_id","branch_id","agent_type");