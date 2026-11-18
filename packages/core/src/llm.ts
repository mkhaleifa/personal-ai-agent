export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
    role: LLMRole;
    content: string;
}

export interface LLMGenerationOptions {
    temperature?: number;
    maxCompletionTokens?: number;
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
}

export interface LLMProvider {
    readonly name: string;

    generate(
        messages: readonly LLMMessage[],
        options?: LLMGenerationOptions
    ): Promise<LLMResponse>;
}
