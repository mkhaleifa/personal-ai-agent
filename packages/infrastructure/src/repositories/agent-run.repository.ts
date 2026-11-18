import { eq } from "drizzle-orm";

import type {
    AgentRun,
    AgentRunRepository,
    CompleteAgentRunInput,
    CreateAgentRunInput,
} from "@personal-agent/core";

import { agentRuns } from "../db/schema.js";
import { createDatabase } from "../db/client.js";

type Database = ReturnType<typeof createDatabase>["db"];

export class DrizzleAgentRunRepository
    implements AgentRunRepository
{
    constructor(private readonly db: Database) {}

    async create(input: CreateAgentRunInput): Promise<AgentRun> {
        const [run] = await this.db
            .insert(agentRuns)
            .values({
                conversationId: input.conversationId,
                status: "pending",
                iterationCount: 0,
                toolCallCount: 0,
            })
            .returning();

        if (!run) {
            throw new Error("Failed to create agent run");
        }

        return run;
    }

    async markRunning(id: string): Promise<AgentRun | null> {
        const [run] = await this.db
            .update(agentRuns)
            .set({
                status: "running",
                startedAt: new Date(),
            })
            .where(eq(agentRuns.id, id))
            .returning();

        return run ?? null;
    }

    async complete(
        id: string,
        input: CompleteAgentRunInput
    ): Promise<AgentRun | null> {
        const [run] = await this.db
            .update(agentRuns)
            .set({
                status: "completed",
                iterationCount: input.iterationCount,
                toolCallCount: input.toolCallCount,
                stopReason: input.stopReason,
                completedAt: new Date(),
                error: null,
            })
            .where(eq(agentRuns.id, id))
            .returning();

        return run ?? null;
    }

    async fail(
        id: string,
        error: string
    ): Promise<AgentRun | null> {
        const [run] = await this.db
            .update(agentRuns)
            .set({
                status: "failed",
                error,
                stopReason: "error",
                completedAt: new Date(),
            })
            .where(eq(agentRuns.id, id))
            .returning();

        return run ?? null;
    }
}
