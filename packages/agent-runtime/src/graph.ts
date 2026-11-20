import {
    END,
    START,
    StateGraph,
} from "@langchain/langgraph";

import type {
    AgentRunRepository,
    LLMMessage,
    LLMProvider,
    MessageRepository,
} from "@personal-agent/core";

import {
    AgentState,
    type AgentGraph,
    type AgentStateType,
} from "./state.js";

import {
    ToolRegistry,
    type ToolPolicy,
} from "./tools/index.js";

const MAX_MODEL_ITERATIONS = 6;

export interface AgentRuntimeDependencies {
    provider: LLMProvider;
    messages: MessageRepository;
    agentRuns: AgentRunRepository;
    toolRegistry: ToolRegistry;
    toolPolicy: ToolPolicy;
}

export function createAgentGraph(
    dependencies: AgentRuntimeDependencies,
): AgentGraph {
    const {
        provider,
        messages,
        agentRuns,
        toolRegistry,
        toolPolicy,
    } = dependencies;

    function getRequestedTools(state: AgentStateType) {
        const lastMessage = state.messages[state.messages.length - 1];

        return lastMessage?.role === "assistant"
            ? (lastMessage.toolCalls ?? [])
            : [];
    }

    async function markRunRunning(state: AgentStateType) {
        const run = await agentRuns.markRunning(state.runId);

        if (!run) {
            throw new Error("Agent run not found");
        }

        return {};
    }

    async function loadConversationHistory(state: AgentStateType) {
        const conversationMessages = await messages.listByConversationId(
            state.conversationId,
            state.userId,
            20,
        );

        const history: LLMMessage[] = conversationMessages
            .filter(
                (message) =>
                    message.role === "user" ||
                    message.role === "assistant",
            )
            .map((message) => ({
                role: message.role as "user" | "assistant",
                content: message.content,
            }));

        const systemMessage: LLMMessage = {
            role: "system",
            content:
                "You are a helpful personal AI assistant. " +
                "Use available tools when they are useful, and never claim that a tool succeeded unless its result confirms it. " +
                "If a tool fails, explain the problem honestly in simple words. " +
                "Reply in plain text only, written as one clear, well-formed paragraph. " +
                "Do not use Markdown or any special formatting: no headings, no hash signs, no dashes or bullet points, no asterisks, no tables, and no code blocks. " +
                "Keep answers short and direct, and give only the key information without extra explanation unless the user asks for more detail. " +
                "Reply in the same language the user writes in.",
        };

        return {
            messages: [systemMessage, ...history],
        };
    }

    async function generateResponse(state: AgentStateType) {
        const response = await provider.generate(state.messages, {
            temperature: 0.2,
            maxCompletionTokens: 1024,
            tools: toolRegistry.getDefinitions(toolPolicy.allowedTools),
        });

        const toolCalls = response.toolCalls ?? [];

        if (toolCalls.length > 0) {
            const assistantToolMessage: LLMMessage = {
                role: "assistant",
                content: response.content || null,
                toolCalls,
            };

            return {
                messages: [...state.messages, assistantToolMessage],
                iterationCount: state.iterationCount + 1,
            };
        }

        if (!response.content.trim()) {
            throw new Error("The model returned an empty response");
        }

        return {
            messages: [
                ...state.messages,
                {
                    role: "assistant" as const,
                    content: response.content,
                },
            ],
            assistantResponse: response.content,
            iterationCount: state.iterationCount + 1,
        };
    }

    function routeAfterModel(state: AgentStateType): string {
        const requestedTools = getRequestedTools(state);

        if (requestedTools.length === 0) {
            return "persist_response";
        }

        if (
            state.toolCallCount + requestedTools.length >
            toolPolicy.maxToolCalls ||
            state.iterationCount >= MAX_MODEL_ITERATIONS
        ) {
            return "tool_limit";
        }

        return "execute_tools";
    }

    async function executeTools(state: AgentStateType) {
        const requestedTools = getRequestedTools(state);

        if (requestedTools.length === 0) {
            throw new Error("Tool execution node received no tool calls");
        }

        const toolMessages: LLMMessage[] = [];

        for (const toolCall of requestedTools) {
            const result = await toolRegistry.execute(
                {
                    id: toolCall.id,
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                },
                {
                    userId: state.userId,
                    signal: new AbortController().signal,
                },
                toolPolicy,
            );

            toolMessages.push({
                role: "tool",
                toolCallId: toolCall.id,
                name: toolCall.name,
                content: JSON.stringify({
                    success: result.success,
                    output: result.output,
                    error: result.error,
                    durationMs: result.durationMs,
                }),
            });
        }

        return {
            messages: [...state.messages, ...toolMessages],
            toolCallCount: state.toolCallCount + requestedTools.length,
        };
    }

    async function handleToolLimit() {
        return {
            assistantResponse:
                "I reached the tool execution limit for this request. " +
                "Please simplify your request or try a smaller task.",
            stopReason: "tool_limit",
        };
    }

    async function persistAssistantResponse(state: AgentStateType) {
        await messages.create(
            {
                conversationId: state.conversationId,
                role: "assistant",
                content: state.assistantResponse,
            },
            state.userId,
        );

        return {};
    }

    async function completeAgentRun(state: AgentStateType) {
        const run = await agentRuns.complete(state.runId, {
            iterationCount: state.iterationCount,
            toolCallCount: state.toolCallCount,
            stopReason: state.stopReason || "completed",
        });

        if (!run) {
            throw new Error("Failed to complete agent run");
        }

        return {};
    }

    const graph = new StateGraph(AgentState)
        .addNode("mark_running", markRunRunning)
        .addNode("load_history", loadConversationHistory)
        .addNode("generate_response", generateResponse)
        .addNode("execute_tools", executeTools)
        .addNode("tool_limit", handleToolLimit)
        .addNode("persist_response", persistAssistantResponse)
        .addNode("complete_run", completeAgentRun)

        .addEdge(START, "mark_running")
        .addEdge("mark_running", "load_history")
        .addEdge("load_history", "generate_response")

        .addConditionalEdges("generate_response", routeAfterModel, {
            execute_tools: "execute_tools",
            persist_response: "persist_response",
            tool_limit: "tool_limit",
        })

        .addEdge("execute_tools", "generate_response")
        .addEdge("tool_limit", "persist_response")
        .addEdge("persist_response", "complete_run")
        .addEdge("complete_run", END)

        .compile();

    return graph as unknown as AgentGraph;
}