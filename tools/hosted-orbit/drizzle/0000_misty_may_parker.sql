CREATE TABLE `app_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_secret` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_state` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`browser_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`account_type` text,
	`encrypted_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`connected_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_owner_platform_external` ON `social_accounts` (`user_id`,`platform`,`external_id`);