CREATE TABLE "organization_webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuration" ADD COLUMN "webhook_url_id" text;--> statement-breakpoint
ALTER TABLE "organization_webhook" ADD CONSTRAINT "organization_webhook_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration" ADD CONSTRAINT "configuration_webhook_url_id_organization_webhook_id_fk" FOREIGN KEY ("webhook_url_id") REFERENCES "public"."organization_webhook"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "webhook_url";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "webhook_secret";