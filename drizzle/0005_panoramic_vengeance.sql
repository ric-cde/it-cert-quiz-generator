DROP INDEX `attempts_quiz`;--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_quiz_question_unique` ON `attempts` (`quiz_id`,`question_id`);