CREATE TABLE `category_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`name` text NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_aliases_exam_name_unique` ON `category_aliases` (`exam_id`,`name`);--> statement-breakpoint
ALTER TABLE `categories` ADD `parent_id` integer REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `categories` ADD `official` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `explanation_md` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `explanation_origin` text;--> statement-breakpoint
ALTER TABLE `sources` ADD `trust` text;--> statement-breakpoint
ALTER TABLE `sources` ADD `reference` text;