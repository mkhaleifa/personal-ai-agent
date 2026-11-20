
import {
    describe,
    expect,
    it,
} from "vitest";

import { ToolRegistry } from "../src/tools/tool-registry.js";
import { calculatorTool } from "../src/tools/calculator.tool.js";
import { currentTimeTool } from "../src/tools/current-time.tool.js";

import type {
    ToolPolicy,
} from "../src/tools/types.js";

const policy: ToolPolicy = {
    allowedTools: [
        "calculate",
        "get_current_time",
    ],
    maxToolCalls: 5,
    timeoutMs: 5000,
};

function createRegistry() {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);
    registry.register(currentTimeTool);

    return registry;
}

const context = {
    userId: "test-user-id",
    signal: new AbortController().signal,
};

describe("Tool Registry", () => {
    it("registers tools", () => {
        const registry = createRegistry();

        expect(registry.list()).toHaveLength(2);
        expect(registry.get("calculate")).toBeDefined();
    });

    it("rejects duplicate tool names", () => {
        const registry = new ToolRegistry();

        registry.register(calculatorTool);

        expect(() => {
            registry.register(calculatorTool);
        }).toThrow("Tool already registered");
    });

    it("executes calculator correctly", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-1",
                name: "calculate",
                arguments: JSON.stringify({
                    a: 150,
                    b: 25,
                    operation: "multiply",
                }),
            },
            context,
            policy
        );

        expect(result.success).toBe(true);
        expect(result.output).toEqual({
            a: 150,
            b: 25,
            operation: "multiply",
            result: 3750,
        });
    });

    it("rejects invalid calculator arguments", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-2",
                name: "calculate",
                arguments: JSON.stringify({
                    a: "150",
                    b: 25,
                    operation: "multiply",
                }),
            },
            context,
            policy
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid tool arguments");
    });

    it("rejects malformed JSON", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-3",
                name: "calculate",
                arguments: "{invalid-json",
            },
            context,
            policy
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("not valid JSON");
    });

    it("rejects unauthorized tools", async () => {
        const registry = createRegistry();

        const restrictedPolicy: ToolPolicy = {
            ...policy,
            allowedTools: [],
        };

        const result = await registry.execute(
            {
                id: "call-4",
                name: "calculate",
                arguments: JSON.stringify({
                    a: 10,
                    b: 5,
                    operation: "add",
                }),
            },
            context,
            restrictedPolicy
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("not permitted");
    });

    it("rejects unknown tools", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-5",
                name: "unknown_tool",
                arguments: "{}",
            },
            context,
            {
                ...policy,
                allowedTools: [...policy.allowedTools, "unknown_tool"],
            }
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unknown tool");
    });

    it("rejects division by zero", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-6",
                name: "calculate",
                arguments: JSON.stringify({
                    a: 10,
                    b: 0,
                    operation: "divide",
                }),
            },
            context,
            policy
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Division by zero");
    });

    it("executes the current-time tool", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-7",
                name: "get_current_time",
                arguments: JSON.stringify({
                    timeZone: "Africa/Cairo",
                }),
            },
            context,
            policy
        );

        expect(result.success).toBe(true);

        expect(
            (result.output as { timeZone: string }).timeZone
        ).toBe("Africa/Cairo");
    });

    it("rejects an invalid timezone", async () => {
        const registry = createRegistry();

        const result = await registry.execute(
            {
                id: "call-8",
                name: "get_current_time",
                arguments: JSON.stringify({
                    timeZone: "Not/A_Timezone",
                }),
            },
            context,
            policy
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid timezone");
    });
});
