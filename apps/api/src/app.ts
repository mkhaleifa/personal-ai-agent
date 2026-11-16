import Fastify from "fastify";
import cors from "@fastify/cors";

import type { createRepositories } from "@personal-agent/infrastructure";

import { registerUserRoutes } from "./routes/users.js";
import { registerConversationRoutes } from "./routes/conversations.js";

type Repositories = ReturnType<typeof createRepositories>;

export async function createApp(
    repositories: Repositories,
) {
    const app = Fastify({
        logger: true,
    });

    await app.register(cors, {
        origin: true,
        allowedHeaders: ["content-type", "x-user-id"],
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    });

    app.get("/health", async () => {
        return {
            status: "ok",
            service: "personal-ai-agent-api",
            timestamp: new Date().toISOString(),
        };
    });

    await registerUserRoutes(app, repositories);

    await registerConversationRoutes(app, repositories);

    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);

        const databaseError = error as { code?: string };

        if (databaseError.code === "23505") {
            return reply.code(409).send({
                error: "CONFLICT",
                message: "A resource with the same unique value already exists",
            });
        }

        return reply.code(500).send({
            error: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred",
        });
    });

    return app;
}