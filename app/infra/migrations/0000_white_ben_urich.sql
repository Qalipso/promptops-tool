CREATE TYPE "public"."asset_lifecycle" AS ENUM('unregistered', 'active', 'deprecated', 'sunset');--> statement-breakpoint
CREATE TYPE "public"."case_result" AS ENUM('pass', 'fail', 'inconclusive', 'incompatible');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."version_state" AS ENUM('draft', 'active', 'previous', 'archived');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"owner" varchar(256) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lifecycle" "asset_lifecycle" DEFAULT 'unregistered' NOT NULL,
	"variable_contract" jsonb NOT NULL,
	"output_contract" jsonb NOT NULL,
	"model_config" jsonb NOT NULL,
	"active_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(256) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"asset_id" varchar(128),
	"version_id" uuid,
	"payload" jsonb NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "run_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_case_id" uuid NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"result" "case_result" NOT NULL,
	"raw_output" text,
	"parsed_output" jsonb,
	"assertion_detail" jsonb,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"inputs" jsonb NOT NULL,
	"assertion" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar(128) NOT NULL,
	"version_id" uuid NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"triggered_by" varchar(256) NOT NULL,
	"total_cases" integer DEFAULT 0 NOT NULL,
	"passed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"inconclusive" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_suite_snapshots" (
	"version_id" uuid NOT NULL,
	"test_case_id" uuid NOT NULL,
	"inputs_snapshot" jsonb NOT NULL,
	"assertion_snapshot" jsonb NOT NULL,
	"name_snapshot" varchar(128) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_suite_snapshots_version_id_test_case_id_pk" PRIMARY KEY("version_id","test_case_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar(128) NOT NULL,
	"version" varchar(32) NOT NULL,
	"parent_version_id" uuid,
	"state" "version_state" DEFAULT 'draft' NOT NULL,
	"body" jsonb NOT NULL,
	"variable_contract_snapshot" jsonb NOT NULL,
	"model_config_snapshot" jsonb NOT NULL,
	"output_contract_snapshot" jsonb NOT NULL,
	"changelog" text,
	"author" varchar(256) NOT NULL,
	"etag" varchar(64) NOT NULL,
	"body_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run_results" ADD CONSTRAINT "run_results_run_id_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run_results" ADD CONSTRAINT "run_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_suite_snapshots" ADD CONSTRAINT "test_suite_snapshots_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_suite_snapshots" ADD CONSTRAINT "test_suite_snapshots_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "versions" ADD CONSTRAINT "versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_owner_idx" ON "assets" USING btree ("owner");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_lifecycle_idx" ON "assets" USING btree ("lifecycle");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_asset_idx" ON "audit_log" USING btree ("asset_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx" ON "audit_log" USING btree ("actor","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_results_run_case_idx" ON "run_results" USING btree ("run_id","test_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "test_cases_asset_name_unique" ON "test_cases" USING btree ("asset_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_runs_version_idx" ON "test_runs" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_runs_asset_status_idx" ON "test_runs" USING btree ("asset_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "versions_asset_version_unique" ON "versions" USING btree ("asset_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "versions_asset_state_idx" ON "versions" USING btree ("asset_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "versions_body_hash_idx" ON "versions" USING btree ("body_hash");