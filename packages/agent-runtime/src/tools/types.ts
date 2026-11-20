import type { z } from "zod";

import type {
    LLMToolDefinition,
} from "@personal-agent/core";

export interface ToolExecutionContext {
    userId: string;
    signal: AbortSignal;
}

export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
    name: string;
    description: string;
    inputSchema: TSchema;
    parameters: Record<string, unknown>;
    timeoutMs?: number;
    execute(
        input: z.infer<TSchema>,
        context: ToolExecutionContext
    ): Promise<unknown> | unknown;
}

export interface ToolExecutionResult {
    toolName: string;
    success: boolean;
    output: unknown;
    error?: string;
    durationMs: number;
}

export interface ToolPolicy {
    allowedTools: string[];
    maxToolCalls: number;
    timeoutMs: number;
}

export interface ToolCallRequest {
    id: string;
    name: string;
    arguments: string;
}
