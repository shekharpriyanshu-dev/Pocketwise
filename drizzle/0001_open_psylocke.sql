CREATE TABLE `commitments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`kind` enum('bill','subscription') NOT NULL,
	`category` varchar(64) NOT NULL,
	`dueDate` date NOT NULL,
	`frequency` varchar(32) NOT NULL DEFAULT 'monthly',
	`active` boolean NOT NULL DEFAULT true,
	`paid` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commitments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`startingBudget` decimal(12,2) NOT NULL DEFAULT '10000',
	`startingBalance` decimal(12,2) NOT NULL DEFAULT '10000',
	`durationDays` int NOT NULL DEFAULT 30,
	`emergencyFundTarget` decimal(12,2) NOT NULL DEFAULT '1500',
	`currency` varchar(8) NOT NULL DEFAULT 'INR',
	`locale` varchar(16) NOT NULL DEFAULT 'en-IN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savings_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`targetAmount` decimal(12,2) NOT NULL,
	`currentSaved` decimal(12,2) NOT NULL DEFAULT '0',
	`targetDate` date NOT NULL,
	`protected` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savings_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`status` enum('simulated','confirmed','cancelled') NOT NULL DEFAULT 'simulated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('expense','income','refund') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` varchar(255) NOT NULL,
	`transactionDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
