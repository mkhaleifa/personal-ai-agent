export type UserId = string;
export type ConversationId = string;
export type MessageId = string;
export type AgentRunId = string;

export type MessageRole =
    | "system"
    | "user"
    | "assistant"
    | "tool";

export type AgentRunStatus =
    | "pending"
    | "running"
    | "waiting_for_approval"
    | "completed"
    | "failed"
    | "cancelled";

export interface User {
    id: UserId;
    displayName: string;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Conversation {
    id: ConversationId;
    userId: UserId;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: MessageId;
    conversationId: ConversationId;
    role: MessageRole;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

export interface AgentRun {
    id: AgentRunId;
    conversationId: ConversationId;
    status: AgentRunStatus;
    iterationCount: number;
    toolCallCount: number;
    stopReason: string | null;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
}

export interface CreateUserInput {
    displayName: string;
    email?: string | null;
}

export interface CreateConversationInput {
    userId: UserId;
    title?: string;
}

export interface CreateMessageInput {
    conversationId: ConversationId;
    role: MessageRole;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface UserRepository {
    create(input: CreateUserInput): Promise<User>;
    findById(id: UserId): Promise<User | null>;
}

export interface ConversationRepository {
    create(input: CreateConversationInput): Promise<Conversation>;

    findById(
        id: ConversationId,
        userId: UserId,
    ): Promise<Conversation | null>;

    listByUserId(userId: UserId): Promise<Conversation[]>;

    updateTitle(
        id: ConversationId,
        userId: UserId,
        title: string,
    ): Promise<Conversation | null>;

    delete(
        id: ConversationId,
        userId: UserId,
    ): Promise<boolean>;
}

export interface MessageRepository {
    create(
        input: CreateMessageInput,
        userId: UserId,
    ): Promise<Message>;

    listByConversationId(
        conversationId: ConversationId,
        userId: UserId,
        limit?: number,
    ): Promise<Message[]>;
}