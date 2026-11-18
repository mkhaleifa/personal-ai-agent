
import "dotenv/config";

import {
    createDatabase,
    createRepositories,
} from "@personal-agent/infrastructure";

import { GroqProvider } from "@personal-agent/integrations";

import { createApp } from "./app.js";

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not defined");
    }

    const database = createDatabase(databaseUrl);

    let app: Awaited<ReturnType<typeof createApp>> | null = null;

    try {
        await database.checkConnection();

        console.log("PostgreSQL connection successful");

        const repositories = createRepositories(database.db);

        const groqApiKey = process.env.GROQ_API_KEY;

        const llmProvider = groqApiKey
            ? new GroqProvider({
                apiKey: groqApiKey,
                model:
                    process.env.GROQ_MODEL ??
                    "openai/gpt-oss-20b",
            })
            : null;

        if (llmProvider) {
            console.log(`LLM provider configured: ${llmProvider.name}`);
        } else {
            console.warn(
                "GROQ_API_KEY is missing. AI chat endpoint will return 503."
            );
        }

        app = await createApp(repositories, llmProvider);

        app.addHook("onClose", async () => {
            await database.close();
        });

        const port = Number(process.env.API_PORT ?? 4000);

        await app.listen({
            port,
            host: "0.0.0.0",
        });

        console.log(`API server listening on port ${port}`);
    } catch (error) {
        console.error("Failed to start API:", error);

        if (app) {
            await app.close();
        } else {
            await database.close();
        }

        process.exitCode = 1;
    }
}

main();