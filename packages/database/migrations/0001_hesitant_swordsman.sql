CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_accessed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `issues_assignee_status_idx` ON `issues` (`assignee_id`,`status`);--> statement-breakpoint
CREATE INDEX `issues_reporter_idx` ON `issues` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `issues_due_date_idx` ON `issues` (`due_date`);--> statement-breakpoint
CREATE INDEX `activity_log_user_created_idx` ON `activity_log` (`user_id`,`created_at`);