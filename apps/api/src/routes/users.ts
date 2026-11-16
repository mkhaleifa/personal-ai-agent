import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { createRepositories } from "@personal-agent/infrastructure";

type Repositories = ReturnType<typeof createRepositories>;

const createUserSchema = z.object({
    displayName: z.string().trim().min(1).max(100),
    email: z
        .string()
        .trim()
        .email()
        .max(254)
        .nullable()
        .optional(),
});

export async function registerUserRoutes(
    app: FastifyInstance,
    repositories: Repositories,
): Promise<void> {
    app.post("/api/users", async (request, reply) => {
        const result = createUserSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send({
                error: "VALIDATION_ERROR",
                message: "Invalid user data",
                details: result.error.flatten(),
            });
        }

        try {
            const user = await repositories.users.create(result.data);

            return reply.code(201).send({
                data: user,
            });
        } catch (error) {
            const databaseError = error as { code?: string };

            if (databaseError.code === "23505") {
                return reply.code(409).send({
                    error: "USER_ALREADY_EXISTS",
                    message: "A user with this email already exists",
                });
            }

            throw error;
        }
    });
}