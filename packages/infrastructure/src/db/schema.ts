import {
    pgEnum,
    pgTable,
    uuid,
    text,
    timestamp,
    integer,
    jsonb,
    index,
} from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", [
    "system",
    "user",
    "assistant",
    "tool",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
    "pending",
    "running",
    "waiting_for_approval",
    "completed",
    "failed",
    "cancelled",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),

    displayName: text("display_name").notNull(),

    email: text("email").unique(),

    createdAt: timestamp("created_at", {
        withTimezone: true,
        mode: "date",
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
        mode: "date",
    })
        .defaultNow()
        .notNull(),
});

export const conversations = pgTable(
    "conversations",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        title: text("title")
            .notNull()
            .default("New conversation"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
            mode: "date",
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
            mode: "date",
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("conversations_user_id_idx").on(table.userId),
        index("conversations_updated_at_idx").on(table.updatedAt),
    ],
);

export const messages = pgTable(
    "messages",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => conversations.id, {
                onDelete: "cascade",
            }),

        role: messageRoleEnum("role").notNull(),

        content: text("content").notNull(),

        metadata: jsonb("metadata")
            .$type<Record<string, unknown>>()
            .notNull()
            .default({}),

        createdAt: timestamp("created_at", {
            withTimezone: true,
            mode: "date",
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("messages_conversation_id_idx").on(table.conversationId),
        index("messages_created_at_idx").on(table.createdAt),
    ],
);

export const agentRuns = pgTable(
    "agent_runs",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => conversations.id, {
                onDelete: "cascade",
            }),

        status: agentRunStatusEnum("status")
            .notNull()
            .default("pending"),

        iterationCount: integer("iteration_count")
            .notNull()
            .default(0),

        toolCallCount: integer("tool_call_count")
            .notNull()
            .default(0),

        stopReason: text("stop_reason"),

        error: text("error"),

        startedAt: timestamp("started_at", {
            withTimezone: true,
            mode: "date",
        }),

        completedAt: timestamp("completed_at", {
            withTimezone: true,
            mode: "date",
        }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
            mode: "date",
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("agent_runs_conversation_id_idx").on(table.conversationId),
        index("agent_runs_status_idx").on(table.status),
    ],
);