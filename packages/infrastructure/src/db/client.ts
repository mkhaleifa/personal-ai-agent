import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.js";

export function createDatabase(databaseUrl: string) {
    if (!databaseUrl) {
        throw new Error("A database connection URL is required");
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });

    const db = drizzle({
        client: pool,
        schema,
    });

    return {
        db,

        async close(): Promise<void> {
            await pool.end();
        },

        async checkConnection(): Promise<void> {
            await pool.query("SELECT 1");
        },
    };
}

export type AppDatabase = ReturnType<
    typeof createDatabase
>["db"];