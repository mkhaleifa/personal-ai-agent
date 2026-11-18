
# Agent Execution

## Overview

The Personal AI Agent uses LangGraph.js to orchestrate
agent execution.

The Agent Runtime is independent of the HTTP API and
LLM provider implementation.

## Execution Flow

1. The API validates the user and conversation.
2. The user message is persisted.
3. A pending agent run is created.
4. LangGraph marks the run as running.
5. Conversation history is loaded.
6. The LLM provider generates a response.
7. The assistant response is persisted.
8. The agent run is marked as completed.

## Graph Nodes

- mark_running
- load_history
- generate_response
- persist_response
- complete_run

## State

The graph state contains:

- userId
- conversationId
- runId
- history
- assistantResponse
- iterationCount

## Error Handling

If graph execution fails, the API marks the
agent run as failed and returns an error response.

## Current Limitations

- No tool execution yet.
- No conditional routing yet.
- No streaming yet.
- No graph checkpoint persistence yet.
- No long-term memory retrieval yet.

These capabilities will be introduced in later stages.
