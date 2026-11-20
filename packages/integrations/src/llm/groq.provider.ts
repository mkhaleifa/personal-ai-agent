
import Groq from "groq-sdk";

import type {
    LLMMessage,
    LLMGenerationOptions,
    LLMProvider,
    LLMResponse,
} from "@personal-agent/core";

export interface GroqProviderOptions {
    apiKey: string;
    model?: string;
}

export class GroqProvider implements LLMProvider {
    readonly name = "groq";

    private readonly client: Groq;
    private readonly model: string;

    constructor(options: GroqProviderOptions) {
        if (!options.apiKey.trim()) {
            throw new Error("Groq API key is required");
        }

        this.client = new Groq({
            apiKey: options.apiKey,
        });

        this.model =
            options.model ?? "openai/gpt-oss-20b";
    }

    async generate(
        messages: readonly LLMMessage[],
        options: LLMGenerationOptions = {}
    ): Promise<LLMResponse> {
        if (messages.length === 0) {
            throw new Error("At least one message is required");
        }

        const groqMessages = messages.map((message) => {
            if (message.role === "tool") {
                if (!message.toolCallId || !message.name) {
                    throw new Error(
                        "Tool messages require toolCallId and name"
                    );
                }

                return {
                    role: "tool" as const,
                    tool_call_id: message.toolCallId,
                    name: message.name,
                    content: message.content ?? "",
                };
            }

            if (message.role === "assistant" && message.toolCalls) {
                return {
                    role: "assistant" as const,
                    content: message.content,
                    tool_calls: message.toolCalls.map((toolCall) => ({
                        id: toolCall.id,
                        type: "function" as const,
                        function: {
                            name: toolCall.name,
                            arguments: toolCall.arguments,
                        },
                    })),
                };
            }

            if (
                message.role === "system" ||
                message.role === "user" ||
                message.role === "assistant"
            ) {
                return {
                    role: message.role,
                    content: message.content ?? "",
                };
            }

            throw new Error("Unsupported LLM message role");
        });

        const completion =
            await this.client.chat.completions.create({
                model: this.model,
                messages: groqMessages,

                temperature: options.temperature ?? 0.2,

                max_completion_tokens:
                    options.maxCompletionTokens ?? 1024,

                ...(options.tools?.length
                    ? {
                        tools: options.tools,
                        tool_choice: "auto" as const,
                        parallel_tool_calls: false,
                    }
                    : {}),
            });

        const choice = completion.choices[0];

        if (!choice) {
            throw new Error("Groq returned an empty completion");
        }

        const content = choice.message.content ?? "";

        const toolCalls =
            choice.message.tool_calls?.map((toolCall) => ({
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
            }));

        const usage = completion.usage;

        return {
            id: completion.id,
            provider: this.name,
            model: completion.model,
            content,
            finishReason: choice.finish_reason,

            usage: usage
                ? {
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens,
                }
                : null,

            toolCalls,
        };
    }
}
