CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`lifecycle` text DEFAULT 'unregistered' NOT NULL,
	`variable_contract` text NOT NULL,
	`output_contract` text NOT NULL,
	`model_config` text NOT NULL,
	`active_version_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_owner_idx` ON `assets` (`owner`);--> statement-breakpoint
CREATE INDEX `assets_lifecycle_idx` ON `assets` (`lifecycle`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`event_type` text NOT NULL,
	`asset_id` text,
	`version_id` text,
	`payload` text NOT NULL,
	`payload_hash` text NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_asset_idx` ON `audit_log` (`asset_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_log_event_type_idx` ON `audit_log` (`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `render_validations` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`inputs_snapshot` text NOT NULL,
	`rendered_system` text,
	`rendered_user` text NOT NULL,
	`rendered_hash` text NOT NULL,
	`unresolved_variables` text DEFAULT '[]' NOT NULL,
	`unused_inputs` text DEFAULT '[]' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `render_validations_version_idx` ON `render_validations` (`version_id`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`version` text NOT NULL,
	`parent_version_id` text,
	`state` text DEFAULT 'draft' NOT NULL,
	`body` text NOT NULL,
	`variable_contract_snapshot` text NOT NULL,
	`model_config_snapshot` text NOT NULL,
	`output_contract_snapshot` text NOT NULL,
	`changelog` text,
	`author` text NOT NULL,
	`etag` text NOT NULL,
	`body_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`promoted_at` integer,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `versions_asset_version_unique` ON `versions` (`asset_id`,`version`);--> statement-breakpoint
CREATE INDEX `versions_asset_state_idx` ON `versions` (`asset_id`,`state`);--> statement-breakpoint
CREATE INDEX `versions_body_hash_idx` ON `versions` (`body_hash`);