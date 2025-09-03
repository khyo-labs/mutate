ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;
UPDATE "user" SET "two_factor_enabled" = false WHERE "two_factor_enabled" IS NULL;
ALTER TABLE "user" ALTER COLUMN "two_factor_enabled" SET NOT NULL;