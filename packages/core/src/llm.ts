export type LLMRole =
    | "system"
    | "user"
    | "assistant"
    | "tool";

export interface LLMToolCall {
    id: string;
    name: string;
    arguments: string;
}

export interface LLMToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface LLMMessage {
    role: LLMRole;
    content: string | null;

    toolCalls?: LLMToolCall[];

    toolCallId?: string;
    name?: string;
}

export interface LLMGenerationOptions {
    temperature?: number;
    maxCompletionTokens?: number;
    tools?: LLMToolDefinition[];
}

export interface LLMTokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface LLMResponse {
    id: string;
    provider: string;
    model: string;
    content: string;
    finishReason: string | null;
    usage: LLMTokenUsage | null;
    toolCalls?: LLMToolCall[];
}

export interface LLMProvider {
    readonly name: string;

    generate(
        messages: readonly LLMMessage[],
        options?: LLMGenerationOptions
    ): Promise<LLMResponse>;
}
