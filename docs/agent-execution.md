
# Agent Execution

## Overview

The Personal AI Agent uses LangGraph.js to orchestrate
agent execution.

The Agent Runtime is independent of the HTTP API and
LLM provider implementation.

## Execution Flow

1. The model receives available tool definitions.
2. The model returns a tool-call request.
3. The graph checks the tool-call budget.
4. The Tool Registry checks permissions.
5. Arguments are parsed and validated using Zod.
6. The tool executes with a timeout.
7. The result is returned to the model.
8. The model generates a final answer.

## Security

- Tools must be explicitly registered.
- Only permitted tools are exposed to the model.
- Tool arguments are validated with Zod.
- Tool execution has a timeout.
- The agent has a maximum tool-call budget.
- Arbitrary code execution is not supported.

## Current Limitations

- Tool permissions are configured by the server.
- Individual tool-call audit records are not yet stored.
- Human approval workflows are not implemented.
- Parallel tool execution is disabled.