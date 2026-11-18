
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { LLMProvider } from "@personal-agent/core";
import { createRepositories } from "@personal-agent/infrastructure";

type Repositories = ReturnType<typeof createRepositories>;

const chatRequestSchema = z.object({
    messages: z.array(
            z.object({
                    role: z.enum(["user", "assistant"]),
                    content: z.string().trim().min(1).max(12000),
                })
                .strict()
        ).min(1).max(20).refine(
            (messages) => messages[messages.length - 1]?.role === "user",
            {
                message: "The last message must be from the user",
            }
        ),
});

export async function registerAIRoutes(
    app: FastifyInstance,
    repositories: Repositories,
    provider: LLMProvider | null
): Promise<void> {
    app.post("/api/ai/chat", async (request, reply) => {
        const userId = request.headers["x-user-id"];

        if (typeof userId !== "string" || !z.string().uuid().safeParse(userId).success) {
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

        if (!provider) {
            return reply.code(503).send({
                error: "LLM provider is not configured",
            });
        }

        const validation = chatRequestSchema.safeParse(request.body);

        if (!validation.success) {
            return reply.code(400).send({
                error: "Invalid chat request",
                details: validation.error.flatten(),
            });
        }

        const systemMessage = {
            role: "system" as const,
            content:
                "You are a helpful personal AI assistant. " +
                "Give accurate, clear, and useful answers. " +
                "If you are uncertain, say so instead of inventing information.",
        };

        try {
            const result = await provider.generate(
                [
                    systemMessage,
                    ...validation.data.messages,
                ],
                {
                    temperature: 0.2,
                    maxCompletionTokens: 1024,
                }
            );

            return reply.code(200).send({
                data: {
                    id: result.id,
                    provider: result.provider,
                    model: result.model,
                    content: result.content,
                    finishReason: result.finishReason,
                    usage: result.usage,
                },
            });
        } catch (error) {
            request.log.error(
                { err: error },
                "LLM provider request failed"
            );

            return reply.code(502).send({
                error: "The AI provider request failed",
            });
        }
    });
}