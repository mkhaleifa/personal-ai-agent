import { eq } from "drizzle-orm";

import type {
    CreateUserInput,
    User,
    UserId,
    UserRepository,
} from "@personal-agent/core";

import type { AppDatabase } from "../db/client.js";
import { users } from "../db/schema.js";

export function createUserRepository(
    db: AppDatabase,
): UserRepository {
    return {
        async create(input: CreateUserInput): Promise<User> {
            const [user] = await db
                .insert(users)
                .values({
                    displayName: input.displayName,
                    email: input.email ?? null,
                })
                .returning();

            if (!user) {
                throw new Error("Failed to create user");
            }

            return user;
        },

        async findById(id: UserId): Promise<User | null> {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, id))
                .limit(1);

            return user ?? null;
        },
    };
}