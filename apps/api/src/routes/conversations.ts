import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";

import { z } from "zod";

import type { createRepositories } from "@personal-agent/infrastructure";

type Repositories = ReturnType<typeof createRepositories>;

const uuidSchema = z.string().uuid();

const conversationParamsSchema = z.object({
    id: uuidSchema,
});

const createConversationSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
});

const updateConversationSchema = z.object({
    title: z.string().trim().min(1).max(200),
});

const createMessageSchema = z.object({
    content: z.string().trim().min(1).max(50_000),
    role: z.literal("user").default("user"),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const messageQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
});

async function requireUser(
    request: FastifyRequest,
    reply: FastifyReply,
    repositories: Repositories,
): Promise<string | null> {
    const rawUserId = request.headers["x-user-id"];

    if (typeof rawUserId !== "string") {
        reply.code(401).send({
            error: "UNAUTHORIZED",
            message: "The x-user-id header is required",
        });

        return null;
    }

    const result = uuidSchema.safeParse(rawUserId);

    if (!result.success) {
        reply.code(401).send({
            error: "INVALID_USER_ID",
            message: "The x-user-id header must contain a valid UUID",
        });

        return null;
    }

    const user = await repositories.users.findById(result.data);

    if (!user) {
        reply.code(401).send({
            error: "USER_NOT_FOUND",
            message: "The requested user does not exist",
        });

        return null;
    }

    return user.id;
}

export async function registerConversationRoutes(
    app: FastifyInstance,
    repositories: Repositories,
): Promise<void> {
    // Create a conversation.
    app.post("/api/conversations", async (request, reply) => {
        const userId = await requireUser(request, reply, repositories);

        if (!userId) {
            return;
        }

        const result = createConversationSchema.safeParse(request.body ?? {});

        if (!result.success) {
            return reply.code(400).send({
                error: "VALIDATION_ERROR",
                message: "Invalid conversation data",
                details: result.error.flatten(),
            });
        }

        const conversation = await repositories.conversations.create({
            userId,
            title: result.data.title,
        });

        return reply.code(201).send({
            data: conversation,
        });
    });

    // List all conversations belonging to the current user.
    app.get("/api/conversations", async (request, reply) => {
        const userId = await requireUser(request, reply, repositories);

        if (!userId) {
            return;
        }

        const conversations =
            await repositories.conversations.listByUserId(userId);

        return reply.send({
            data: conversations,
        });
    });

    // Get one conversation and its messages.
    app.get("/api/conversations/:id", async (request, reply) => {
        const userId = await requireUser(request, reply, repositories);

        if (!userId) {
            return;
        }

        const params = conversationParamsSchema.safeParse(request.params);

        if (!params.success) {
            return reply.code(400).send({
                error: "INVALID_CONVERSATION_ID",
                message: "The conversation ID must be a valid UUID",
            });
        }

        const conversation =
            await repositories.conversations.findById(
                params.data.id,
                userId,
            );

        if (!conversation) {
            return reply.code(404).send({
                error: "CONVERSATION_NOT_FOUND",
                message: "Conversation not found",
            });
        }

        const messages =
            await repositories.messages.listByConversationId(
                conversation.id,
                userId,
            );

        return reply.send({
            data: {
                conversation,
                messages,
            },
        });
    });

    // List messages in a conversation.
    app.get(
        "/api/conversations/:id/messages",
        async (request, reply) => {
            const userId = await requireUser(request, reply, repositories);

            if (!userId) {
                return;
            }

            const params = conversationParamsSchema.safeParse(request.params);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_CONVERSATION_ID",
                    message: "The conversation ID must be a valid UUID",
                });
            }

            const query = messageQuerySchema.safeParse(request.query);

            if (!query.success) {
                return reply.code(400).send({
                    error: "VALIDATION_ERROR",
                    message: "Invalid message query",
                    details: query.error.flatten(),
                });
            }

            const conversation =
                await repositories.conversations.findById(
                    params.data.id,
                    userId,
                );

            if (!conversation) {
                return reply.code(404).send({
                    error: "CONVERSATION_NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            const messages =
                await repositories.messages.listByConversationId(
                    conversation.id,
                    userId,
                    query.data.limit,
                );

            return reply.send({
                data: messages,
            });
        },
    );

    // Add a message to a conversation.
    app.post(
        "/api/conversations/:id/messages",
        async (request, reply) => {
            const userId = await requireUser(request, reply, repositories);

            if (!userId) {
                return;
            }

            const params = conversationParamsSchema.safeParse(request.params);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_CONVERSATION_ID",
                    message: "The conversation ID must be a valid UUID",
                });
            }

            const result = createMessageSchema.safeParse(request.body);

            if (!result.success) {
                return reply.code(400).send({
                    error: "VALIDATION_ERROR",
                    message: "Invalid message data",
                    details: result.error.flatten(),
                });
            }

            const conversation =
                await repositories.conversations.findById(
                    params.data.id,
                    userId,
                );

            if (!conversation) {
                return reply.code(404).send({
                    error: "CONVERSATION_NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            const message = await repositories.messages.create(
                {
                    conversationId: conversation.id,
                    role: result.data.role,
                    content: result.data.content,
                    metadata: result.data.metadata,
                },
                userId,
            );

            return reply.code(201).send({
                data: message,
            });
        },
    );

    // Rename a conversation.
    app.patch("/api/conversations/:id", async (request, reply) => {
        const userId = await requireUser(request, reply, repositories);

        if (!userId) {
            return;
        }

        const params = conversationParamsSchema.safeParse(request.params);

        if (!params.success) {
            return reply.code(400).send({
                error: "INVALID_CONVERSATION_ID",
                message: "The conversation ID must be a valid UUID",
            });
        }

        const result = updateConversationSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send({
                error: "VALIDATION_ERROR",
                message: "Invalid conversation data",
                details: result.error.flatten(),
            });
        }

        const conversation =
            await repositories.conversations.updateTitle(
                params.data.id,
                userId,
                result.data.title,
            );

        if (!conversation) {
            return reply.code(404).send({
                error: "CONVERSATION_NOT_FOUND",
                message: "Conversation not found",
            });
        }

        return reply.send({
            data: conversation,
        });
    });

    // Delete a conversation.
    app.delete("/api/conversations/:id", async (request, reply) => {
        const userId = await requireUser(request, reply, repositories);

        if (!userId) {
            return;
        }

        const params = conversationParamsSchema.safeParse(request.params);

        if (!params.success) {
            return reply.code(400).send({
                error: "INVALID_CONVERSATION_ID",
                message: "The conversation ID must be a valid UUID",
            });
        }

        const deleted = await repositories.conversations.delete(
            params.data.id,
            userId,
        );

        if (!deleted) {
            return reply.code(404).send({
                error: "CONVERSATION_NOT_FOUND",
                message: "Conversation not found",
            });
        }

        return reply.code(204).send();
    });
}