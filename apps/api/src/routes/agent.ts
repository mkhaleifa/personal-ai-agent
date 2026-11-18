import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
    createRepositories,
} from "@personal-agent/infrastructure";

import {
    createAgentGraph,
} from "@personal-agent/agent-runtime";

import type {
    LLMProvider,
} from "@personal-agent/core";

type Repositories = ReturnType<typeof createRepositories>;

const paramsSchema = z.object({
    id: z.string().uuid(),
});

const bodySchema = z.object({
    message: z.string().trim().min(1).max(12000),
});

export async function registerAgentRoutes(
    app: FastifyInstance,
    repositories: Repositories,
    provider: LLMProvider | null
): Promise<void> {
    app.post(
        "/api/conversations/:id/agent-runs",
        async (request, reply) => {
            const userId = request.headers["x-user-id"];

            if ( typeof userId !== "string" || !z.string().uuid().safeParse(userId).success ){
                return reply.code(401).send({
                    error: "A valid x-user-id header is required",
                });
            }

            const user = await repositories.users.findById(userId);

            if (!user) {
                return reply.code(401).send({
                    error: "User not found",
                });
            }

            const params = paramsSchema.safeParse(request.params);

            if (!params.success) {
                return reply.code(400).send({
                    error: "Invalid conversation ID",
                });
            }

            const body = bodySchema.safeParse(request.body);

            if (!body.success) {
                return reply.code(400).send({
                    error: "Invalid request body",
                    details: body.error.flatten(),
                });
            }

            if (!provider) {
                return reply.code(503).send({
                    error: "LLM provider is not configured",
                });
            }

            const conversationId = params.data.id;

            const conversation =
                await repositories.conversations.findById(
                    conversationId,
                    userId
                );

            if (!conversation) {
                return reply.code(404).send({
                    error: "Conversation not found",
                });
            }

            const userMessage = await repositories.messages.create(
                {
                    conversationId,
                    role: "user",
                    content: body.data.message,
                },
                userId
            );

            const run = await repositories.agentRuns.create({
                conversationId,
            });

            const graph = createAgentGraph({
                provider,
                messages: repositories.messages,
                agentRuns: repositories.agentRuns,
            });

            try {
                const result = await graph.invoke({
                    userId,
                    conversationId,
                    runId: run.id,
                });

                return reply.code(200).send({
                    data: {
                        runId: run.id,
                        conversationId,
                        userMessageId: userMessage.id,
                        assistantResponse: result.assistantResponse,
                        status: "completed",
                        iterationCount: result.iterationCount,
                        toolCallCount: 0,
                    },
                });
            } catch (error) {
                request.log.error(
                    { err: error, runId: run.id },
                    "Agent execution failed"
                );

                try {
                    await repositories.agentRuns.fail(
                        run.id,
                        error instanceof Error
                            ? error.message
                            : "Unknown agent execution error"
                    );
                } catch (persistenceError) {
                    request.log.error(
                        { err: persistenceError, runId: run.id },
                        "Failed to mark agent run as failed"
                    );
                }

                return reply.code(502).send({
                    error: "Agent execution failed",
                    runId: run.id,
                });
            }
        }
    );
}
