import {
    and,
    desc,
    eq,
} from "drizzle-orm";

import type {
    Conversation,
    ConversationRepository,
    CreateConversationInput,
    ConversationId,
    UserId,
} from "@personal-agent/core";

import type { AppDatabase } from "../db/client.js";
import { conversations } from "../db/schema.js";

export function createConversationRepository(
    db: AppDatabase,
): ConversationRepository {
    return {
        async create(
            input: CreateConversationInput,
        ): Promise<Conversation> {
            const [conversation] = await db
                .insert(conversations)
                .values({
                    userId: input.userId,
                    title: input.title ?? "New conversation",
                })
                .returning();

            if (!conversation) {
                throw new Error("Failed to create conversation");
            }

            return conversation;
        },

        async findById(
            id: ConversationId,
            userId: UserId,
        ): Promise<Conversation | null> {
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(
                    and(
                        eq(conversations.id, id),
                        eq(conversations.userId, userId),
                    ),
                )
                .limit(1);

            return conversation ?? null;
        },

        async listByUserId(
            userId: UserId,
        ): Promise<Conversation[]> {
            return db
                .select()
                .from(conversations)
                .where(eq(conversations.userId, userId))
                .orderBy(desc(conversations.updatedAt));
        },

        async updateTitle(
            id: ConversationId,
            userId: UserId,
            title: string,
        ): Promise<Conversation | null> {
            const [conversation] = await db
                .update(conversations)
                .set({
                    title,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(conversations.id, id),
                        eq(conversations.userId, userId),
                    ),
                )
                .returning();

            return conversation ?? null;
        },

        async delete(
            id: ConversationId,
            userId: UserId,
        ): Promise<boolean> {
            const deleted = await db
                .delete(conversations)
                .where(
                    and(
                        eq(conversations.id, id),
                        eq(conversations.userId, userId),
                    ),
                )
                .returning({
                    id: conversations.id,
                });

            return deleted.length > 0;
        },
    };
}