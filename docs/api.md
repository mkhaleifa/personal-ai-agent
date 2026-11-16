# Personal AI Agent API

Base URL: `http://localhost:4000`

## Development identity

Conversation endpoints currently require an `x-user-id` header.

This is a temporary local-development mechanism, not authentication.

Do not expose this API publicly until real authentication is implemented.

## Users

### Create user

POST `/api/users`

Request:

{
"displayName": "Mohamed",
"email": "mohamed@example.local"
}

Response: 201 Created.

## Conversations

All conversation endpoints require the `x-user-id` header.

### Create conversation

POST `/api/conversations`

Request:

{
"title": "My first conversation"
}

### List conversations

GET `/api/conversations`

### Get conversation and messages

GET `/api/conversations/:id`

### Rename conversation

PATCH `/api/conversations/:id`

Request:

{
"title": "Updated title"
}

### Delete conversation

DELETE `/api/conversations/:id`

## Messages

### Create user message

POST `/api/conversations/:id/messages`

Request:

{
"content": "Hello, agent!"
}

Only user messages can be submitted through this public endpoint.

### List messages

GET `/api/conversations/:id/messages?limit=100`

The limit must be between 1 and 500.

## Error responses

Errors use a consistent structure:

{
"error": "ERROR_CODE",
"message": "Description"
}

Validation errors may also contain a `details` field.