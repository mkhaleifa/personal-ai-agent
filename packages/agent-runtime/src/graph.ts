import {END, START, StateGraph,} from "@langchain/langgraph";

import type {AgentRunRepository, LLMMessage, LLMProvider, MessageRepository,} from "@personal-agent/core";

import { AgentState, type AgentGraph, type AgentStateType,} from "./state.js";

export interface AgentRuntimeDependencies {
    provider: LLMProvider;
    messages: MessageRepository;
    agentRuns: AgentRunRepository;
}

export function createAgentGraph(
    dependencies: AgentRuntimeDependencies,
): AgentGraph {
    const { provider, messages, agentRuns } = dependencies;

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

        return { history };
    }

    async function generateResponse(state: AgentStateType) {
        const systemMessage: LLMMessage = {
            role: "system",
            content:
                "You are a helpful personal AI assistant. " +
                "Answer clearly and accurately. " +
                "Do not invent facts when you are uncertain.",
        };

        const response = await provider.generate(
            [systemMessage, ...state.history],
            {
                temperature: 0.2,
                maxCompletionTokens: 1024,
            },
        );

        if (!response.content.trim()) {
            throw new Error("The model returned an empty response");
        }

        return {
            assistantResponse: response.content,
            iterationCount: state.iterationCount + 1,
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
            toolCallCount: 0,
            stopReason: "completed",
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
        .addNode("persist_response", persistAssistantResponse)
        .addNode("complete_run", completeAgentRun)

        .addEdge(START, "mark_running")
        .addEdge("mark_running", "load_history")
        .addEdge("load_history", "generate_response")
        .addEdge("generate_response", "persist_response")
        .addEdge("persist_response", "complete_run")
        .addEdge("complete_run", END)

        .compile();

    return graph as unknown as AgentGraph;
}