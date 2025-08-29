ALTER TABLE "configuration" RENAME COLUMN "webhook_url" TO "callback_url";--> statement-breakpoint
ALTER TABLE "transformation_job" RENAME COLUMN "webhook_url" TO "callback_url";