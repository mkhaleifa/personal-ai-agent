
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import type {
    LLMMessage,
    LLMProvider,
    LLMResponse,
} from "@personal-agent/core";

import { createApp } from "../src/app.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";

const receivedMessages: LLMMessage[][] = [];

const fakeProvider: LLMProvider = {
    name: "fake",

    async generate(messages): Promise<LLMResponse> {
        receivedMessages.push([...messages]);

        return {
            id: "test-completion-id",
            provider: "fake",
            model: "fake-model",
            content: "Hello! I am your personal AI assistant.",
            finishReason: "stop",
            usage: {
                inputTokens: 10,
                outputTokens: 12,
                totalTokens: 22,
            },
        };
    },
};

const fakeRepositories = {
    users: {
        findById: async (id: string) => {
            if (id !== USER_ID) {
                return null;
            }

            return {
                id: USER_ID,
                displayName: "Test User",
                email: "test@example.com",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        },
    },
} as unknown as Parameters<typeof createApp>[0];

describe("AI API", () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        receivedMessages.length = 0;

        app = await createApp(
            fakeRepositories,
            fakeProvider
        );
    });

    afterEach(async () => {
        await app.close();
    });

    it("generates an AI response", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/ai/chat",
            headers: {
                "x-user-id": USER_ID,
            },
            payload: {
                messages: [
                    {
                        role: "user",
                        content: "Hello, who are you?",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.data.content).toBe(
            "Hello! I am your personal AI assistant."
        );

        expect(body.data.provider).toBe("fake");

        expect(receivedMessages).toHaveLength(1);

        expect(receivedMessages[0][0].role).toBe("system");
        expect(receivedMessages[0][1].role).toBe("user");
    });

    it("rejects requests without a user ID", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/ai/chat",
            payload: {
                messages: [
                    {
                        role: "user",
                        content: "Hello",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it("rejects unknown users", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/ai/chat",
            headers: {
                "x-user-id": "00000000-0000-4000-8000-000000000099",
            },
            payload: {
                messages: [
                    {
                        role: "user",
                        content: "Hello",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it("rejects empty messages", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/ai/chat",
            headers: {
                "x-user-id": USER_ID,
            },
            payload: {
                messages: [
                    {
                        role: "user",
                        content: "",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it("returns 503 when no provider is configured", async () => {
        const appWithoutProvider = await createApp(
            fakeRepositories,
            null
        );

        try {
            const response = await appWithoutProvider.inject({
                method: "POST",
                url: "/api/ai/chat",
                headers: {
                    "x-user-id": USER_ID,
                },
                payload: {
                    messages: [
                        {
                            role: "user",
                            content: "Hello",
                        },
                    ],
                },
            });

            expect(response.statusCode).toBe(503);
        } finally {
            await appWithoutProvider.close();
        }
    });
});