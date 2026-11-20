import { ToolRegistry } from "./tool-registry.js";

import { calculatorTool } from "./calculator.tool.js";
import { currentTimeTool } from "./current-time.tool.js";

export * from "./types.js";
export * from "./tool-registry.js";

export function createDefaultToolRegistry(): ToolRegistry {
    const registry = new ToolRegistry();

    registry.register(calculatorTool);
    registry.register(currentTimeTool);

    return registry;
}