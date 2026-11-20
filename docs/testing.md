
# Testing Strategy

## Overview

The Personal AI Agent uses three testing levels:

1. Unit tests
2. Integration tests
3. End-to-end manual verification

## Unit Tests

Unit tests verify individual components independently.

Examples:

- Tool Registry
- Calculator tool
- Current-time tool
- Tool input validation
- Tool permissions
- Agent graph behavior with a fake provider

Run:

```bash
pnpm --filter @personal-agent/agent-runtime test
```

## Integration Tests

Integration tests verify that multiple components work together.

The API integration tests use:

- Fastify
- PostgreSQL
- Drizzle ORM
- Real repositories
- LangGraph
- Tool Registry
- A deterministic fake LLM provider

The test database must be separate from the development database.

Configure:

```env
DATABASE_URL_TEST=postgresql://agent:agent_dev_password@localhost:5432/personal_agent_test
```

Apply migrations:

```bash
DATABASE_URL="postgresql://agent:agent_dev_password@localhost:5432/personal_agent_test" pnpm db:migrate
```

Run:

```bash
DATABASE_URL="postgresql://agent:agent_dev_password@localhost:5433/personal_agent_test" pnpm --filter @personal-agent/api test
```

## Tested Scenarios

- User and conversation persistence
- Message persistence
- Conversation ownership
- Agent Run creation
- Tool calling
- Calculator execution
- Assistant response persistence
- Agent Run completion
- LLM failure handling
- Failed Agent Run persistence

## Fake LLM Provider

Automated tests use a deterministic fake provider.

The fake provider:

1. Returns a calculator tool call.
2. Receives the tool result.
3. Returns a final assistant response.

This avoids external API dependencies and makes tests repeatable.

## Manual End-to-End Testing

The real application can be tested using Groq.

Manual scenarios:

1. Normal conversation
2. Calculator tool execution
3. Follow-up question using conversation history

## Current Limitations

- Authentication still uses a temporary x-user-id header.
- Tool-call audit records are not yet stored individually.
- Conversation history is limited to recent messages.
- Long-term personal memory is not implemented yet.
- Document RAG is not implemented yet.
- Streaming is not implemented yet.

These features are planned for the following development stages.
