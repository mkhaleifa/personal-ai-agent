
import { z } from "zod";

import type { ToolDefinition } from "./types.js";

const currentTimeSchema = z.object({
    timeZone: z.string().min(1).max(100).optional(),
}).strict();

export const currentTimeTool: ToolDefinition<typeof currentTimeSchema> = {
    name: "get_current_time",
    description:
        "Get the current date and time for an IANA timezone, " +
        "such as Africa/Cairo or Europe/London. " +
        "Use UTC if no timezone is specified.",
    inputSchema: currentTimeSchema,
    parameters: {
        type: "object",
        properties: {
            timeZone: {
                type: "string",
                description:
                    "An IANA timezone, for example Africa/Cairo",
            },
        },
        required: [],
        additionalProperties: false,
    },

    timeoutMs: 1000,

    execute({ timeZone }) {
        const selectedTimeZone = timeZone ?? "UTC";

        const now = new Date();

        try {
            const formattedTime = new Intl.DateTimeFormat(
                "en-GB",
                {
                    dateStyle: "full",
                    timeStyle: "long",
                    timeZone: selectedTimeZone,
                }
            ).format(now);

            return {
                timeZone: selectedTimeZone,
                isoTimestamp: now.toISOString(),
                formattedTime,
            };
        } catch {
            throw new Error(
                `Invalid timezone: ${selectedTimeZone}`
            );
        }
    },
};
