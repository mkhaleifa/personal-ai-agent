mohamedkhalifa@192 personal-ai-agent % curl http://localhost:4000/api/conversations/98e11900-9b97-4656-846c-0532c3a36eab \
-H "x-user-id: 123f72c1-1035-4722-b68a-55e189553135"
{"data":{"conversation":{
"id":"98e11900-9b97-4656-846c-0532c3a36eab",
"userId":"123f72c1-1035-4722-b68a-55e189553135,
"title":"Learning Personal AI Agent",
"createdAt":"2026-11-16T02:21:09.433Z",
"updatedAt":"2026-11-16T02:25:05.936Z"},
"messages":[
{"id":"005ec094-1435-4c87-bf58-3bac4d5e6e1d",
"conversationId":"98e11900-9b97-4656-846c-0532c3a36eab",
"role":"user",
"content":"I am building a Personal AI Agent using TypeScript and PostgreSQL.",
"metadata":{},"createdAt":"2026-11-16T02:25:05.932Z"}]}}%



curl -X PATCH http://localhost:4000/api/conversations/98e11900-9b97-4656-846c-0532c3a36eab \
-H "Content-Type: application/json" \
-H "x-user-id: 123f72c1-1035-4722-b68a-55e189553135" \
-d '{
"title": "My Personal AI Agent Project"
}'



curl -X DELETE http://localhost:4000/api/conversations/98e11900-9b97-4656-846c-0532c3a36eab \
-H "x-user-id: 123f72c1-1035-4722-b68a-55e189553135" \
