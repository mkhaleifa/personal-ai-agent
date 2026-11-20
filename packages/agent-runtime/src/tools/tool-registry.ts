import type {
    LLMToolDefinition,
} from "@personal-agent/core";

import type {
    ToolCallRequest,
    ToolDefinition,
    ToolExecutionContext,
    ToolExecutionResult,
    ToolPolicy,
} from "./types.js";

export class ToolRegistry {
    private readonly tools = new Map<string, ToolDefinition>();

    register(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            throw new Error(
                `Tool already registered: ${tool.name}`
            );
        }

        this.tools.set(tool.name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    list(): ToolDefinition[] {
        return [...this.tools.values()];
    }

    getDefinitions(
        allowedTools?: string[]
    ): LLMToolDefinition[] {
        return this.list()
            .filter(
                (tool) =>
                    !allowedTools || allowedTools.includes(tool.name)
            )
            .map((tool) => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));
    }

    async execute(
        request: ToolCallRequest,
        context: ToolExecutionContext,
        policy: ToolPolicy
    ): Promise<ToolExecutionResult> {
        const start = Date.now();

        const fail = (
            error: string
        ): ToolExecutionResult => ({
            toolName: request.name,
            success: false,
            output: null,
            error,
            durationMs: Date.now() - start,
        });

        if (!policy.allowedTools.includes(request.name)) {
            return fail("Tool execution is not permitted");
        }

        const tool = this.tools.get(request.name);

        if (!tool) {
            return fail("Unknown tool");
        }

        let parsedArguments: unknown;

        try {
            parsedArguments = JSON.parse(request.arguments);
        } catch {
            return fail("Tool arguments are not valid JSON");
        }

        const validation = tool.inputSchema.safeParse(
            parsedArguments
        );

        if (!validation.success) {
            return fail(
                `Invalid tool arguments: ${validation.error.message}`
            );
        }

        const controller = new AbortController();

        const timeoutMs = Math.min(
            tool.timeoutMs ?? policy.timeoutMs,
            policy.timeoutMs
        );

        const timeout = setTimeout(
            () => controller.abort(),
            timeoutMs
        );

        try {
            if (context.signal.aborted) {
                return fail("Tool execution was cancelled");
            }

            const execution = Promise.resolve(
                tool.execute(validation.data, {
                    ...context,
                    signal: controller.signal,
                })
            );

            const timeoutPromise = new Promise<never>(
                (_, reject) => {
                    controller.signal.addEventListener(
                        "abort",
                        () => reject(
                            new Error("Tool execution timed out")
                        ),
                        { once: true }
                    );
                }
            );

            const output = await Promise.race([
                execution,
                timeoutPromise,
            ]);

            return {
                toolName: request.name,
                success: true,
                output,
                durationMs: Date.now() - start,
            };
        } catch (error) {
            return fail(
                error instanceof Error
                    ? error.message
                    : "Tool execution failed"
            );
        } finally {
            clearTimeout(timeout);
        }
    }
}
