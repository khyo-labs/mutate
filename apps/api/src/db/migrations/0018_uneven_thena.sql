CREATE TABLE "webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"configuration_id" text NOT NULL,
	"target_url" text NOT NULL,
	"webhook_url_id" text,
	"event_type" varchar(100) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" varchar(128) NOT NULL,
	"signature" text,
	"signed_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt" timestamp,
	"next_attempt" timestamp,
	"response_status" integer,
	"response_body" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_delivery_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_configuration_id_configuration_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configuration"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_webhook_url_id_organization_webhook_id_fk" FOREIGN KEY ("webhook_url_id") REFERENCES "public"."organization_webhook"("id") ON DELETE no action ON UPDATE no action;