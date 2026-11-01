
export type UserId = string;
export type ConversationId = string;
export type MessageId = string;
export type AgentRunId = string;

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface Message {
    id: MessageId;
    conversationId: ConversationId;
    role: MessageRole;
    content: string;
    createdAt: Date;
}

export interface Conversation {
    id: ConversationId;
    userId: UserId;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export type AgentRunStatus =
    | "pending"
    | "running"
    | "waiting_for_approval"
    | "completed"
    | "failed"
    | "cancelled";
