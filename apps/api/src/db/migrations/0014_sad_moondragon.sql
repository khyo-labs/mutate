ALTER TABLE "user" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "active_organization_id";