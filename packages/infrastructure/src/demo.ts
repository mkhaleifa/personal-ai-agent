import "dotenv/config";

import { createDatabase, createRepositories } from "./index.js";

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not defined");
    }

    const database = createDatabase(databaseUrl);

    try {
        await database.checkConnection();

        console.log("Database connection successful");

        const repositories = createRepositories(database.db);

        // 1. Create a user.
        const user = await repositories.users.create({
            displayName: "Personal Agent Demo",
            email: `demo-${Date.now()}@example.local`,
        });

        console.log("\nCreated user:");
        console.log(user);

        // 2. Create a conversation for that user.
        const conversation = await repositories.conversations.create({
            userId: user.id,
            title: "My first persistent conversation",
        });

        console.log("\nCreated conversation:");
        console.log(conversation);

        // 3. Save a user message.
        const userMessage = await repositories.messages.create(
            {
                conversationId: conversation.id,
                role: "user",
                content: "My name is Mohamed. I am building a Personal AI Agent.",
                metadata: {
                    source: "database-smoke-test",
                },
            },
            user.id,
        );

        console.log("\nCreated user message:");
        console.log(userMessage);

        // 4. Save an assistant message.
        const assistantMessage = await repositories.messages.create(
            {
                conversationId: conversation.id,
                role: "assistant",
                content: "I will use this conversation as context.",
            },
            user.id,
        );

        console.log("\nCreated assistant message:");
        console.log(assistantMessage);

        // 5. Read the conversation.
        const savedConversation =
            await repositories.conversations.findById(
                conversation.id,
                user.id,
            );

        console.log("\nRetrieved conversation:");
        console.log(savedConversation);

        // 6. Read the messages.
        const savedMessages =
            await repositories.messages.listByConversationId(
                conversation.id,
                user.id,
            );

        console.log("\nRetrieved messages:");
        console.log(savedMessages);

        // 7. Read all conversations for this user.
        const userConversations =
            await repositories.conversations.listByUserId(user.id);

        console.log("\nUser conversations:");
        console.log(userConversations);

        if (
            !savedConversation ||
            savedMessages.length !== 2 ||
            userConversations.length !== 1
        ) {
            throw new Error("Database smoke test failed");
        }

        console.log("\nAll database smoke tests passed.");
    } finally {
        await database.close();
    }
}

main().catch((error: unknown) => {
    console.error("Database smoke test failed:", error);
    process.exitCode = 1;
});