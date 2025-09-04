CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0,
	"workspace_overrides" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" text,
	"changes" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" integer NOT NULL,
	"metadata" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admin" ADD COLUMN "require_2fa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_admin" ADD COLUMN "last_2fa_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "platform_admin" ADD COLUMN "trusted_ips" text[];--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_admin_id_platform_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."platform_admin"("id") ON DELETE no action ON UPDATE no action;