ALTER TABLE `financial_profiles` ADD CONSTRAINT `financial_profiles_user_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `commitments` ADD CONSTRAINT `commitments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_profiles` ADD CONSTRAINT `financial_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savings_goals` ADD CONSTRAINT `savings_goals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenarios` ADD CONSTRAINT `scenarios_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `commitments_user_idx` ON `commitments` (`userId`);--> statement-breakpoint
CREATE INDEX `savings_goals_user_idx` ON `savings_goals` (`userId`);--> statement-breakpoint
CREATE INDEX `scenarios_user_idx` ON `scenarios` (`userId`);--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`userId`);