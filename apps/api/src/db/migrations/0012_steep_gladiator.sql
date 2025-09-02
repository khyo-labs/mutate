ALTER TABLE "subscription_plan" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plan" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Set the free plan as default
UPDATE "subscription_plan" SET "is_default" = true WHERE "id" = 'plan_free';--> statement-breakpoint
-- Create a unique partial index to ensure only one default plan
CREATE UNIQUE INDEX idx_only_one_default_plan ON "subscription_plan" ("is_default") WHERE "is_default" = true;