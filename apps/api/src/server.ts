import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({
    logger: true,
});

const port = Number(process.env.API_PORT ?? 4000);

await app.register(cors, {
    origin: true,
});

app.get("/health", async () => {
    return {
        status: "ok",
        service: "personal-ai-agent-api",
        timestamp: new Date().toISOString(),
    };
});

try {
    await app.listen({
        port,
        host: "0.0.0.0",
    });
} catch (error) {
    app.log.error(error);
    process.exit(1);
}
