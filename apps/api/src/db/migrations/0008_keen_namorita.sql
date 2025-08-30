CREATE TABLE "active_conversion" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "active_conversion_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "billing_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"stripe_event_id" text,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"stripe_subscription_id" text,
	"status" varchar(50) NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"override_monthly_limit" integer,
	"override_concurrent_limit" integer,
	"override_max_file_size_mb" integer,
	"override_overage_price_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"monthly_conversion_limit" integer,
	"concurrent_conversion_limit" integer,
	"max_file_size_mb" integer,
	"price_cents" integer NOT NULL,
	"billing_interval" varchar(20) NOT NULL,
	"overage_price_cents" integer,
	"features" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_record" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"overage_count" integer DEFAULT 0 NOT NULL,
	"conversion_type_breakdown" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_record_organization_id_month_year_unique" UNIQUE("organization_id","month","year")
);
--> statement-breakpoint
ALTER TABLE "active_conversion" ADD CONSTRAINT "active_conversion_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_conversion" ADD CONSTRAINT "active_conversion_job_id_transformation_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."transformation_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_event" ADD CONSTRAINT "billing_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;