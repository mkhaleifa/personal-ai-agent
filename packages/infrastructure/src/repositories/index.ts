import type { AppDatabase } from "../db/client.js";

import { createUserRepository } from "./user.repository.js";
import { createConversationRepository } from "./conversation.repository.js";
import { createMessageRepository } from "./message.repository.js";

export function createRepositories(db: AppDatabase) {
    return {
        users: createUserRepository(db),

        conversations: createConversationRepository(db),

        messages: createMessageRepository(db),
    };
}