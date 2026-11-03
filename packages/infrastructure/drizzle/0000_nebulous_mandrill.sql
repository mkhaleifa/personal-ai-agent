CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

CREATE TYPE "public"."agent_run_status" AS ENUM(
  'pending',
  'running',
  'waiting_for_approval',
  'completed',
  'failed',
  'cancelled'
);
--> statement-breakpoint

CREATE TYPE "public"."message_role" AS ENUM(
  'system',
  'user',
  'assistant',
  'tool'
);
--> statement-breakpoint

CREATE TABLE "agent_runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL,
    "status" "agent_run_status" DEFAULT 'pending' NOT NULL,
    "iteration_count" integer DEFAULT 0 NOT NULL,
    "tool_call_count" integer DEFAULT 0 NOT NULL,
    "stop_reason" text,
    "error" text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "title" text DEFAULT 'New conversation' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL,
    "role" "message_role" NOT NULL,
    "content" text NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "display_name" text NOT NULL,
    "email" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint

ALTER TABLE "agent_runs"
    ADD CONSTRAINT "agent_runs_conversation_id_conversations_id_fk"
        FOREIGN KEY ("conversation_id")
            REFERENCES "public"."conversations"("id")
            ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_user_id_users_id_fk"
        FOREIGN KEY ("user_id")
            REFERENCES "public"."users"("id")
            ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "messages"
    ADD CONSTRAINT "messages_conversation_id_conversations_id_fk"
        FOREIGN KEY ("conversation_id")
            REFERENCES "public"."conversations"("id")
            ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "agent_runs_conversation_id_idx"
    ON "agent_runs" USING btree ("conversation_id");
--> statement-breakpoint

CREATE INDEX "agent_runs_status_idx"
    ON "agent_runs" USING btree ("status");
--> statement-breakpoint

CREATE INDEX "conversations_user_id_idx"
    ON "conversations" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX "conversations_updated_at_idx"
    ON "conversations" USING btree ("updated_at");
--> statement-breakpoint

CREATE INDEX "messages_conversation_id_idx"
    ON "messages" USING btree ("conversation_id");
--> statement-breakpoint

CREATE INDEX "messages_created_at_idx"
    ON "messages" USING btree ("created_at");
