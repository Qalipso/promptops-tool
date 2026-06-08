CREATE TABLE `eval_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`version_id` text,
	`filename` text,
	`summary` text NOT NULL,
	`parsed` text NOT NULL,
	`raw` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `eval_imports_asset_idx` ON `eval_imports` (`asset_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`name` text NOT NULL,
	`input` text NOT NULL,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_cases_asset_idx` ON `test_cases` (`asset_id`);--> statement-breakpoint
ALTER TABLE `assets` ADD `builder_spec` text;