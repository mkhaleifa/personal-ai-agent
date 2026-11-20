
import "dotenv/config";

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import { Pool } from "pg";

import {
    createDatabase,
    createRepositories,
} from "@personal-agent/infrastructure";

import type {
    LLMMessage,
    LLMProvider,
    LLMResponse,
} from "@personal-agent/core";

import { createApp } from "../src/app.js";

// --------------------------------------------------
// 1. Test database configuration
// --------------------------------------------------

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
    throw new Error(
        "DATABASE_URL_TEST is required to run integration tests"
    );
}

// --------------------------------------------------
// 2. Fake LLM provider
// --------------------------------------------------

let generationCount = 0;
let shouldFail = false;

const fakeProvider: LLMProvider = {
    name: "fake",

    async generate(
        messages: readonly LLMMessage[]
    ): Promise<LLMResponse> {
        generationCount++;

        // Simulate an external LLM failure.
        if (shouldFail) {
            throw new Error("Simulated LLM provider failure");
        }

        // First call: request the calculator tool.
        if (generationCount === 1) {
            const userMessage = messages.find(
                (message) => message.role === "user"
            );

            if (!userMessage) {
                throw new Error("User message was not provided to the LLM");
            }

            return {
                id: "fake-tool-call",
                provider: "fake",
                model: "fake-model",
                content: "",
                finishReason: "tool_calls",
                usage: null,
                toolCalls: [
                    {
                        id: "call_calculate_001",
                        name: "calculate",
                        arguments: JSON.stringify({
                            a: 150,
                            b: 25,
                            operation: "multiply",
                        }),
                    },
                ],
            };
        }

        // Second call: verify that the tool result reached the LLM.
        const toolMessage = [...messages]
            .reverse()
            .find((message) => message.role === "tool");

        if (!toolMessage?.content?.includes("3750")) {
            throw new Error(
                "Calculator result was not included in the LLM context"
            );
        }

        return {
            id: "fake-final-answer",
            provider: "fake",
            model: "fake-model",
            content: "150 multiplied by 25 is 3750.",
            finishReason: "stop",
            usage: null,
        };
    },
};

// --------------------------------------------------
// 3. Test resources
// --------------------------------------------------

describe("Agent integration tests", () => {
    let database: ReturnType<typeof createDatabase>;
    let repositories: ReturnType<typeof createRepositories>;
    let app: Awaited<ReturnType<typeof createApp>>;
    let pool: Pool;

    let userId: string;

    const conversationIds: string[] = [];

    async function createTestConversation(title: string) {
        const conversation = await repositories.conversations.create({
            userId,
            title,
        });

        conversationIds.push(conversation.id);

        return conversation;
    }

    beforeAll(async () => {
        database = createDatabase(testDatabaseUrl);

        await database.checkConnection();

        repositories = createRepositories(database.db);

        pool = new Pool({
            connectionString: testDatabaseUrl,
        });

        const user = await repositories.users.create({
            displayName: "Day 7 Integration Test",
            email: `day7-${Date.now()}@example.test`,
        });

        userId = user.id;

        app = await createApp(repositories, fakeProvider);
    });

    afterAll(async () => {
        // Remove conversations created by this test suite.
        for (const conversationId of conversationIds) {
            await repositories.conversations.delete(
                conversationId,
                userId
            );
        }

        await app.close();
        await pool.end();
        await database.close();
    });

    // ------------------------------------------------
    // TEST 1: Real repository integration
    // ------------------------------------------------

    it("persists conversations and messages in PostgreSQL", async () => {
        const conversation = await createTestConversation(
            "Repository integration test"
        );

        const message = await repositories.messages.create(
            {
                conversationId: conversation.id,
                role: "user",
                content: "Hello from the integration test",
            },
            userId
        );

        const savedMessages =
            await repositories.messages.listByConversationId(
                conversation.id,
                userId
            );

        expect(savedMessages).toHaveLength(1);
        expect(savedMessages[0]?.id).toBe(message.id);
        expect(savedMessages[0]?.content).toBe(
            "Hello from the integration test"
        );
    });

    // ------------------------------------------------
    // TEST 2: Ownership protection
    // ------------------------------------------------

    it("prevents another user from accessing a conversation", async () => {
        const conversation = await createTestConversation(
            "Ownership test"
        );

        const otherUser = await repositories.users.create({
            displayName: "Another Test User",
            email: `other-${Date.now()}@example.test`,
        });

        const foundConversation =
            await repositories.conversations.findById(
                conversation.id,
                otherUser.id
            );

        expect(foundConversation).toBeNull();

        const otherUserMessages =
            await repositories.messages.listByConversationId(
                conversation.id,
                otherUser.id
            );

        expect(otherUserMessages).toHaveLength(0);

        await expect(
            repositories.messages.create(
                {
                    conversationId: conversation.id,
                    role: "user",
                    content: "This should not be saved",
                },
                otherUser.id
            )
        ).rejects.toThrow("Conversation not found");
    });

    // ------------------------------------------------
    // TEST 3: Complete agent workflow
    // ------------------------------------------------

    it("executes the calculator tool and persists the final answer", async () => {
        generationCount = 0;
        shouldFail = false;

        const conversation = await createTestConversation(
            "Agent tool integration test"
        );

        const response = await app.inject({
            method: "POST",
            url: `/api/conversations/${conversation.id}/agent-runs`,
            headers: {
                "x-user-id": userId,
            },
            payload: {
                message: "Multiply 150 by 25 using the calculator tool.",
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.data.status).toBe("completed");

        expect(body.data.assistantResponse).toBe(
            "150 multiplied by 25 is 3750."
        );

        expect(body.data.iterationCount).toBe(2);
        expect(body.data.toolCallCount).toBe(1);

        // Verify that the Agent Run was persisted.
        const runResult = await pool.query(
            `SELECT status, iteration_count, tool_call_count
       FROM agent_runs
       WHERE id = $1`,
            [body.data.runId]
        );

        expect(runResult.rows).toHaveLength(1);

        expect(runResult.rows[0]).toMatchObject({
            status: "completed",
            iteration_count: 2,
            tool_call_count: 1,
        });

        // Verify that user and assistant messages were persisted.
        const messageResult = await pool.query(
            `SELECT role, content
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
            [conversation.id]
        );

        expect(messageResult.rows).toHaveLength(2);

        expect(messageResult.rows[0]).toMatchObject({
            role: "user",
            content: "Multiply 150 by 25 using the calculator tool.",
        });

        expect(messageResult.rows[1]).toMatchObject({
            role: "assistant",
            content: "150 multiplied by 25 is 3750.",
        });
    });

    // ------------------------------------------------
    // TEST 4: LLM failure handling
    // ------------------------------------------------

    it("marks the Agent Run as failed when the LLM throws an error", async () => {
        generationCount = 0;
        shouldFail = true;

        const conversation = await createTestConversation(
            "Agent failure integration test"
        );

        const response = await app.inject({
            method: "POST",
            url: `/api/conversations/${conversation.id}/agent-runs`,
            headers: {
                "x-user-id": userId,
            },
            payload: {
                message: "This request should fail.",
            },
        });

        expect(response.statusCode).toBe(502);

        const body = response.json();

        expect(body.error).toBe("Agent execution failed");
        expect(body.runId).toBeDefined();

        // Verify failure was saved in PostgreSQL.
        const runResult = await pool.query(
            `SELECT status, stop_reason, error
       FROM agent_runs
       WHERE id = $1`,
            [body.runId]
        );

        expect(runResult.rows).toHaveLength(1);

        expect(runResult.rows[0].status).toBe("failed");
        expect(runResult.rows[0].stop_reason).toBe("error");
        expect(runResult.rows[0].error).toBe(
            "Simulated LLM provider failure"
        );

        shouldFail = false;
    });
});
