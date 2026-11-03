import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
}

export default defineConfig({
    dialect: "postgresql",

    schema: "./packages/infrastructure/src/db/schema.ts",

    out: "./packages/infrastructure/drizzle",

    dbCredentials: {
        url: databaseUrl,
    },

    migrations: {
        schema: "public",
        table: "__drizzle_migrations",
    },
});