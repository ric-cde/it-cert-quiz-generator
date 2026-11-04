CREATE TABLE `ai_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`quiz_id` integer NOT NULL,
	`selected_option_ids` text NOT NULL,
	`response_text` text,
	`result` text NOT NULL,
	`kind` text NOT NULL,
	`feedback_md` text,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_user_question` ON `attempts` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `attempts_quiz` ON `attempts` (`quiz_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`name` text NOT NULL,
	`weight` real,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_exam_name_unique` ON `categories` (`exam_id`,`name`);--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapters_source_name_unique` ON `chapters` (`source_id`,`name`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`input` text NOT NULL,
	`draft_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_id` integer NOT NULL,
	`name` text NOT NULL,
	`mock_question_count` integer,
	`mock_time_limit_min` integer,
	`pass_mark_pct` integer,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exams_pass_mark_range" CHECK("exams"."pass_mark_pct" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exams_subject_name_unique` ON `exams` (`subject_id`,`name`);--> statement-breakpoint
CREATE TABLE `explanations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`body_md` text NOT NULL,
	`sources` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `explanations_question_id_unique` ON `explanations` (`question_id`);--> statement-breakpoint
CREATE TABLE `options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`body_md` text NOT NULL,
	`explanation_md` text,
	`explanation_origin` text,
	`is_correct` integer NOT NULL,
	`position` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `options_question` ON `options` (`question_id`);--> statement-breakpoint
CREATE TABLE `question_stats` (
	`user_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`difficulty` integer,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`latest_correct` integer DEFAULT false NOT NULL,
	`ever_correct` integer DEFAULT false NOT NULL,
	`last_seen_at` integer,
	PRIMARY KEY(`user_id`, `question_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "question_stats_difficulty_range" CHECK("question_stats"."difficulty" BETWEEN 0 AND 10)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`type` text NOT NULL,
	`body_md` text NOT NULL,
	`model_answer_md` text,
	`lock_option_order` integer DEFAULT false NOT NULL,
	`external_id` text,
	`content_hash` text NOT NULL,
	`flagged_at` integer,
	`flag_reason` text,
	`deleted_at` integer,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_chapter` ON `questions` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `questions_category` ON `questions` (`category_id`);--> statement-breakpoint
CREATE INDEX `questions_external_id` ON `questions` (`external_id`);--> statement-breakpoint
CREATE INDEX `questions_content_hash` ON `questions` (`content_hash`);--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`exam_id` integer NOT NULL,
	`mode` text NOT NULL,
	`config` text NOT NULL,
	`question_ids` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quizzes_user_exam` ON `quizzes` (`user_id`,`exam_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`priority_weights` text NOT NULL,
	`quiz_defaults` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`name` text NOT NULL,
	`rating` integer,
	`origin` text NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sources_rating_range" CHECK("sources"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_exam_name_unique` ON `sources` (`exam_id`,`name`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_name_unique` ON `subjects` (`name`);--> statement-breakpoint
CREATE TABLE `user_exams` (
	`user_id` integer NOT NULL,
	`exam_id` integer NOT NULL,
	`exam_date` text,
	PRIMARY KEY(`user_id`, `exam_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
