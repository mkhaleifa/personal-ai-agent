
import type { ToolPolicy } from "./types.js";

export const DEFAULT_TOOL_POLICY: ToolPolicy = {
    allowedTools: [
        "calculate",
        "get_current_time",
    ],

    maxToolCalls: 5,

    timeoutMs: 5000,
};
