CREATE TABLE `important_items` (
	`todo_id` text PRIMARY KEY NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`is_excluded` integer DEFAULT false NOT NULL,
	`sort_order` text,
	`sort_parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
