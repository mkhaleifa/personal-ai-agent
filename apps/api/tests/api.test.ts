import "dotenv/config";

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import {
    createDatabase,
    createRepositories,
} from "@personal-agent/infrastructure";

import { createApp } from "../src/app.js";

describe("Personal AI Agent API", () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required for API tests");
    }

    const database = createDatabase(databaseUrl);

    const repositories = createRepositories(database.db);

    const appPromise = createApp(repositories);

    let app: Awaited<typeof appPromise>;

    let userId: string;

    let conversationId: string;

    beforeAll(async () => {
        app = await appPromise;

        await database.checkConnection();
    });

    afterAll(async () => {
        if (conversationId && userId) {
            await repositories.conversations.delete(
                conversationId,
                userId,
            );
        }

        if (app) {
            await app.close();
        }

        await database.close();
    });

    it("creates a user", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/users",
            payload: {
                displayName: "API Test User",
                email: `api-test-${Date.now()}@example.local`,
            },
        });

        expect(response.statusCode).toBe(201);

        const body = response.json();

        expect(body.data.id).toBeDefined();
        expect(body.data.displayName).toBe("API Test User");

        userId = body.data.id;
    });

    it("rejects an invalid user", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/users",
            payload: {
                displayName: "",
                email: "not-an-email",
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().error).toBe("VALIDATION_ERROR");
    });

    it("requires a user identity to create a conversation", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/conversations",
            payload: {
                title: "Test conversation",
            },
        });

        expect(response.statusCode).toBe(401);
    });

    it("creates a conversation", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/conversations",
            headers: {
                "x-user-id": userId,
            },
            payload: {
                title: "API integration test",
            },
        });

        expect(response.statusCode).toBe(201);

        const body = response.json();

        expect(body.data.id).toBeDefined();
        expect(body.data.title).toBe("API integration test");

        conversationId = body.data.id;
    });

    it("creates a message", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/api/conversations/${conversationId}/messages`,
            headers: {
                "x-user-id": userId,
            },
            payload: {
                content: "Hello from the API test",
                role: "user",
            },
        });

        expect(response.statusCode).toBe(201);

        const body = response.json();

        expect(body.data.content).toBe("Hello from the API test");
        expect(body.data.role).toBe("user");
    });

    it("rejects an empty message", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/api/conversations/${conversationId}/messages`,
            headers: {
                "x-user-id": userId,
            },
            payload: {
                content: "",
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it("retrieves a conversation with its messages", async () => {
        const response = await app.inject({
            method: "GET",
            url: `/api/conversations/${conversationId}`,
            headers: {
                "x-user-id": userId,
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.data.conversation.id).toBe(conversationId);
        expect(body.data.messages).toHaveLength(1);
        expect(body.data.messages[0].content).toBe(
            "Hello from the API test",
        );
    });

    it("lists conversations", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/api/conversations",
            headers: {
                "x-user-id": userId,
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("renames a conversation", async () => {
        const response = await app.inject({
            method: "PATCH",
            url: `/api/conversations/${conversationId}`,
            headers: {
                "x-user-id": userId,
            },
            payload: {
                title: "Updated conversation title",
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json().data.title).toBe(
            "Updated conversation title",
        );
    });

    it("deletes a conversation", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: `/api/conversations/${conversationId}`,
            headers: {
                "x-user-id": userId,
            },
        });

        expect(response.statusCode).toBe(204);

        conversationId = "";

        const getResponse = await app.inject({
            method: "GET",
            url: "/api/conversations/00000000-0000-4000-8000-000000000000",
            headers: {
                "x-user-id": userId,
            },
        });

        expect(getResponse.statusCode).toBe(404);
    });
});