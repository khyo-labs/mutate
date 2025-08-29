ALTER TABLE "configuration" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "input_file_key" text;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "output_file_key" text;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "original_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "webhook_delivered" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "webhook_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "transformation_job" ADD COLUMN "webhook_last_attempt" timestamp;