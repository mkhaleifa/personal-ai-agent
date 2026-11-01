
# Personal AI Agent - Architecture

## 1. Overview

Personal AI Agent is a local-first AI assistant
with persistent memory, personal knowledge retrieval,
    controlled tool execution, and observable agent runs.

## 2. Architecture Style

The application uses a Modular Monolith architecture
inside a pnpm monorepo.

    Each capability owns a specific business responsibility.

    Infrastructure implementations are separated
from application capabilities.

## 3. Main Components

### Applications

- apps/api: HTTP API and SSE endpoints.
- apps/web: User interface.

### Core

- Shared domain models.
- Contracts.
- Common errors.
- Event definitions.

### Capabilities

- Conversations.
- Messages.
- Memory.
- Knowledge.
- Retrieval.
- Tools.
- Agent runs.
- Streaming.

### Agent Runtime

- Agent state.
- Execution graph.
- Context construction.
- Execution policies.

### Integrations

- LLM providers.
- Embedding providers.
- Document loaders.

### Infrastructure

- PostgreSQL.
- Repositories.
- File storage.
- Database migrations.

### Observability

- Structured logging.
- Metrics.
- Execution tracing.

## 4. Dependency Rules

1. Core must not depend on infrastructure.
2. Capabilities must not depend on HTTP frameworks.
3. API routes must delegate business logic to capabilities.
4. Database access must happen through repository interfaces.
5. Agent runtime must use provider abstractions.
6. External providers must not leak provider-specific
types into core domain contracts.

## 5. Execution Flow

User Message
    -> API
    -> Conversation
    -> Context Builder
    -> Memory Retrieval
    -> Knowledge Retrieval
    -> Agent Runtime
    -> LLM / Tools
-> Streaming
    -> Persistence

## 6. Deployment

The application is designed to run locally
using Docker Compose for infrastructure
    and a locally installed LLM runtime.
