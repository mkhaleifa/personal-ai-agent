
import { z } from "zod";

import type { ToolDefinition } from "./types.js";

const calculatorSchema = z.object({
    a: z.number().finite(),
    b: z.number().finite(),
    operation: z.enum([
        "add",
        "subtract",
        "multiply",
        "divide",
    ]),
}).strict();

export const calculatorTool: ToolDefinition<typeof calculatorSchema> = {
    name: "calculate",
    description:
        "Perform basic arithmetic on two numbers. " +
        "Use this tool when the user asks for a calculation.",
    inputSchema: calculatorSchema,
    parameters: {
        type: "object",
        properties: {
            a: {
                type: "number",
                description: "The first number",
            },
            b: {
                type: "number",
                description: "The second number",
            },
            operation: {
                type: "string",
                enum: [
                    "add",
                    "subtract",
                    "multiply",
                    "divide",
                ],
                description: "The arithmetic operation",
            },
        },
        required: ["a", "b", "operation"],
        additionalProperties: false,
    },

    timeoutMs: 1000,

    execute({ a, b, operation }) {
        let result: number;

        switch (operation) {
            case "add":
                result = a + b;
                break;

            case "subtract":
                result = a - b;
                break;

            case "multiply":
                result = a * b;
                break;

            case "divide":
                if (b === 0) {
                    throw new Error("Division by zero is not allowed");
                }

                result = a / b;
                break;
        }
        if (!Number.isFinite(result)) {
            throw new Error("Calculation produced an invalid result");
        }
        return {
            a,
            b,
            operation,
            result,
        };
    },
};
