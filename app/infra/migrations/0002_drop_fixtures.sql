-- Migration 0002: Remove fixtures concept entirely.
-- PromptOps is now a prompt registry: assets + versions + render preview (manual inputs).
-- Render checks also removed (handled by AI Eval, not PromptOps).

-- 1. Drop foreign keys / dependent tables first
DROP TABLE IF EXISTS "fixture_snapshots";
--> statement-breakpoint

-- 2. Drop fixtures table itself (CASCADE drops dependent FK on render_validations.fixture_id)
DROP TABLE IF EXISTS "fixtures" CASCADE;
--> statement-breakpoint

-- 3. render_validations had fixture_id and source/checks columns — keep columns for now
--    (data preserved, app no longer writes them). Optional cleanup in 0003.
