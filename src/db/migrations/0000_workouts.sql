CREATE TABLE "workouts" (
	"user_id" uuid NOT NULL,
	"source" text DEFAULT 'intervals_icu' NOT NULL,
	"id" text NOT NULL,
	"sport" text NOT NULL,
	"name" text NOT NULL,
	"start_local" timestamp NOT NULL,
	"timezone" text NOT NULL,
	"distance_m" double precision,
	"moving_sec" integer NOT NULL,
	"elapsed_sec" integer NOT NULL,
	"elevation_gain_m" double precision,
	"avg_hr" integer,
	"max_hr" integer,
	"training_load" double precision,
	"cadence_spm" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_user_id_source_id_pk" PRIMARY KEY("user_id","source","id")
);
--> statement-breakpoint
ALTER TABLE "workouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "workouts_user_start_idx" ON "workouts" USING btree ("user_id","start_local");--> statement-breakpoint
CREATE POLICY "workouts_owner" ON "workouts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "workouts"."user_id") WITH CHECK ((select auth.uid()) = "workouts"."user_id");