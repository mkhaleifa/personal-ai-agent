import { z } from "zod";

import type { LLMMessage } from "@personal-agent/core";

export const AgentState = z.object({
    userId: z.string(),

    conversationId: z.string(),

    runId: z.string(),

    messages: z.array(z.custom<LLMMessage>()).default(() => []),

    assistantResponse: z.string().default(""),

    iterationCount: z.number().default(0),

    toolCallCount: z.number().default(0),

    stopReason: z.string().default(""),
});


export type AgentStateType = z.infer<typeof AgentState>;

export type AgentGraphInput = z.input<typeof AgentState>;

export interface AgentGraph {
    invoke(input: AgentGraphInput): Promise<AgentStateType>;
}