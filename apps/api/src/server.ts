import "dotenv/config";

import { createDatabase, createRepositories } from "@personal-agent/infrastructure";

import { createApp } from "./app.js";

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not defined");
    }

    const database = createDatabase(databaseUrl);

    try {
        await database.checkConnection();

        console.log("PostgreSQL connection successful");

        const repositories = createRepositories(database.db);

        const app = await createApp(repositories);

        app.addHook("onClose", async () => {
            await database.close();
        });

        const port = Number(process.env.API_PORT ?? 4000);

        await app.listen({
            port,
            host: "0.0.0.0",
        });
    } catch (error) {
        console.error("Failed to start API:", error);

        await database.close();

        process.exitCode = 1;
    }
}

main();