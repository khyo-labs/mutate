ALTER TABLE "organization_webhook" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_webhook" DROP COLUMN "is_default";