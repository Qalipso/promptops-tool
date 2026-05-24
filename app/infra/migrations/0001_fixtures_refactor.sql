-- Migration 0001: PromptOps concept refactor
-- Renames test_cases → fixtures (PromptOps is a registry, not an evaluator)
-- Drops test_runs + run_results (LLM evaluation removed from PromptOps scope)
-- Creates fixture_snapshots (replaces test_suite_snapshots)
-- Creates render_validations (template rendering validation, no LLM)
--
-- IMPORTANT: This migration uses IF EXISTS guards on renames.
-- On a fresh database it runs cleanly.
-- On an already-migrated database the renames are skipped (idempotent for creates).

--> statement-breakpoint
-- 1. Drop tables that have FKs pointing to test_cases (order matters)
DROP TABLE IF EXISTS "run_results";
--> statement-breakpoint
DROP TABLE IF EXISTS "test_runs";
--> statement-breakpoint
DROP TABLE IF EXISTS "test_suite_snapshots";
--> statement-breakpoint

-- 2. Rename test_cases → fixtures
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'test_cases'
  ) THEN
    ALTER TABLE "test_cases" RENAME TO "fixtures";
  END IF;
END $$;
--> statement-breakpoint

-- 3. Rename unique index
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'test_cases_asset_name_unique'
  ) THEN
    ALTER INDEX "test_cases_asset_name_unique" RENAME TO "fixtures_asset_name_unique";
  END IF;
END $$;
--> statement-breakpoint

-- 4. Rename column: assertion → checks (render check config, not LLM output assertion)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fixtures' AND column_name = 'assertion'
  ) THEN
    ALTER TABLE "fixtures" RENAME COLUMN "assertion" TO "checks";
  END IF;
END $$;
--> statement-breakpoint

-- 5. Create fixture_snapshots (audit artifact — frozen record of fixtures at promotion time)
CREATE TABLE IF NOT EXISTS "fixture_snapshots" (
  "version_id" uuid NOT NULL,
  "fixture_id" uuid NOT NULL,
  "inputs_snapshot" jsonb NOT NULL,
  "checks_snapshot" jsonb NOT NULL,
  "name_snapshot" varchar(128) NOT NULL,
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fixture_snapshots_pk" PRIMARY KEY("version_id","fixture_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fixture_snapshots"
    ADD CONSTRAINT "fixture_snapshots_version_fk"
    FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fixture_snapshots"
    ADD CONSTRAINT "fixture_snapshots_fixture_fk"
    FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- 6. Create render_validations (result of template rendering with fixture or manual inputs)
--    source: 'fixture' | 'manual'
--    rendered_hash: SHA256 of rendered text for reproducibility proof
--    checks_config: the RenderCheck definitions that were evaluated
--    render_check_results: pass/fail/warning per check
--    unresolved_variables: {{vars}} still present in rendered output
--    unused_inputs: input keys not referenced in the template
CREATE TABLE IF NOT EXISTS "render_validations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL,
  "fixture_id" uuid,
  "source" varchar(16) NOT NULL DEFAULT 'manual',
  "inputs_snapshot" jsonb NOT NULL,
  "rendered_system" text,
  "rendered_user" text NOT NULL,
  "rendered_hash" varchar(64) NOT NULL,
  "checks_config" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "render_check_results" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "unresolved_variables" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "unused_inputs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_by" varchar(256) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "render_validations"
    ADD CONSTRAINT "render_validations_version_fk"
    FOREIGN KEY ("version_id") REFERENCES "versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "render_validations"
    ADD CONSTRAINT "render_validations_fixture_fk"
    FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "render_validations_version_idx"
  ON "render_validations" USING btree ("version_id");
--> statement-breakpoint

-- 7. Drop obsolete enums (LLM run status + case result — no longer in PromptOps scope)
DROP TYPE IF EXISTS "run_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "case_result";
