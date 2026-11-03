import {
    and,
    asc,
    eq,
} from "drizzle-orm";

import type {
    CreateMessageInput,
    Message,
    MessageRepository,
    UserId,
} from "@personal-agent/core";

import type { AppDatabase } from "../db/client.js";
import {
    conversations,
    messages,
} from "../db/schema.js";

export function createMessageRepository(
    db: AppDatabase,
): MessageRepository {
    return {
        async create(
            input: CreateMessageInput,
            userId: UserId,
        ): Promise<Message> {
            const [conversation] = await db
                .select({
                    id: conversations.id,
                })
                .from(conversations)
                .where(
                    and(
                        eq(conversations.id, input.conversationId),
                        eq(conversations.userId, userId),
                    ),
                )
                .limit(1);

            if (!conversation) {
                throw new Error("Conversation not found");
            }

            const [message] = await db
                .insert(messages)
                .values({
                    conversationId: input.conversationId,
                    role: input.role,
                    content: input.content,
                    metadata: input.metadata ?? {},
                })
                .returning();

            if (!message) {
                throw new Error("Failed to create message");
            }

            await db
                .update(conversations)
                .set({
                    updatedAt: new Date(),
                })
                .where(eq(conversations.id, input.conversationId));

            return message;
        },

        async listByConversationId(
            conversationId: string,
            userId: UserId,
            limit = 100,
        ): Promise<Message[]> {
            if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
                throw new Error("Message limit must be between 1 and 500");
            }

            return db
                .select({
                    id: messages.id,
                    conversationId: messages.conversationId,
                    role: messages.role,
                    content: messages.content,
                    metadata: messages.metadata,
                    createdAt: messages.createdAt,
                })
                .from(messages)
                .innerJoin(
                    conversations,
                    eq(messages.conversationId, conversations.id),
                )
                .where(
                    and(
                        eq(messages.conversationId, conversationId),
                        eq(conversations.userId, userId),
                    ),
                )
                .orderBy(asc(messages.createdAt))
                .limit(limit);
        },
    };
}