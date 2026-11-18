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

        this.model = options.model ?? "openai/gpt-oss-20b";
    }

    async generate(
        messages: readonly LLMMessage[],
        options: LLMGenerationOptions = {}
    ): Promise<LLMResponse> {
        if (messages.length === 0) {
            throw new Error("At least one message is required");
        }

        const completion = await this.client.chat.completions.create({
            model: this.model,

            messages: messages.map((message) => ({
                role: message.role,
                content: message.content,
            })),

            temperature: options.temperature ?? 0.2,

            max_completion_tokens:
                options.maxCompletionTokens ?? 1024,
        });

        const choice = completion.choices[0];

        if (!choice) {
            throw new Error("Groq returned an empty completion");
        }

        const content = choice.message.content;

        if (typeof content !== "string") {
            throw new Error("Groq returned an empty or unsupported response");
        }

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
        };
    }
}
