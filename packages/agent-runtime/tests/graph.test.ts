import {
    describe,
    expect,
    it,
} from "vitest";

import type {
    LLMProvider,
    LLMResponse,
    Message,
} from "@personal-agent/core";

import {
    createAgentGraph,
    createDefaultToolRegistry,
    DEFAULT_TOOL_POLICY,
} from "../src/index.js";

describe("Agent Graph Tool Execution", () => {
    it("executes a tool and returns a final answer", async () => {
        let modelCalls = 0;
        const savedMessages: Message[] = [];

        const provider: LLMProvider = {
            name: "fake",

            async generate(): Promise<LLMResponse> {
                modelCalls += 1;

                if (modelCalls === 1) {
                    return {
                        id: "completion-1",
                        provider: "fake",
                        model: "fake-model",
                        content: "",
                        finishReason: "tool_calls",
                        usage: null,
                        toolCalls: [
                            {
                                id: "call-1",
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

                return {
                    id: "completion-2",
                    provider: "fake",
                    model: "fake-model",
                    content: "150 multiplied by 25 is 3750.",
                    finishReason: "stop",
                    usage: null,
                    toolCalls: [],
                };
            },
        };

        const messageRepository = {
            async listByConversationId() {
                return [
                    {
                        id: "message-1",
                        conversationId: "conversation-1",
                        role: "user" as const,
                        content: "Calculate 150 multiplied by 25.",
                        metadata: {},
                        createdAt: new Date(),
                    },
                ];
            },

            async create(input: {
                conversationId: string;
                role: "assistant";
                content: string;
            }) {
                const message = {
                    id: "assistant-message",
                    conversationId: input.conversationId,
                    role: input.role,
                    content: input.content,
                    metadata: {},
                    createdAt: new Date(),
                };

                savedMessages.push(message);

                return message;
            },
        };

        const agentRunRepository = {
            async markRunning() {
                return {
                    id: "run-1",
                    conversationId: "conversation-1",
                    status: "running" as const,
                    iterationCount: 0,
                    toolCallCount: 0,
                    stopReason: null,
                    error: null,
                    startedAt: new Date(),
                    completedAt: null,
                };
            },

            async complete(
                _id: string,
                input: {
                    iterationCount: number;
                    toolCallCount: number;
                    stopReason: string;
                }
            ) {
                expect(input.iterationCount).toBe(2);
                expect(input.toolCallCount).toBe(1);

                return {
                    id: "run-1",
                    conversationId: "conversation-1",
                    status: "completed" as const,
                    iterationCount: input.iterationCount,
                    toolCallCount: input.toolCallCount,
                    stopReason: input.stopReason,
                    error: null,
                    startedAt: new Date(),
                    completedAt: new Date(),
                };
            },
        };

        const graph = createAgentGraph({
            provider,
            messages: messageRepository as never,
            agentRuns: agentRunRepository as never,
            toolRegistry: createDefaultToolRegistry(),
            toolPolicy: DEFAULT_TOOL_POLICY,
        });

        const result = await graph.invoke({
            userId: "user-1",
            conversationId: "conversation-1",
            runId: "run-1",
        });

        expect(modelCalls).toBe(2);

        expect(result.assistantResponse).toBe(
            "150 multiplied by 25 is 3750."
        );

        expect(result.toolCallCount).toBe(1);
        expect(result.iterationCount).toBe(2);

        expect(savedMessages).toHaveLength(1);
        expect(savedMessages[0].role).toBe("assistant");
    });
});
