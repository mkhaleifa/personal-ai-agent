"message": "Explain what an AI agent is in simple terms."
}'
{"data":{"runId":"f23077ef-1fc2-42e0-a328-0e06b7b4d8c9",
"conversationId":"656e8b70-60c9-4881-972b-27d2db94898e",
"userMessageId":"3aee228b-13af-4188-af1b-dfea4738351c",
"assistantResponse":"An **AI agent** is a piece of software that can observe its environment, 
make decisions, and take actions to achieve a goal.
Think of it like a tiny robot inside a computer:\n\n1.
**Observes** – It gathers information (e.g., sensor data, user input, or a game board).\n2.
**Decides** – It processes that information using algorithms or learned patterns to choose what to do next.\n3. 
**Acts** – It performs an action (e.g., move a character, answer a question, recommend a product).\n\nThe 
“agent” part comes from the idea that it acts on behalf of someone or something, 
just like a human agent represents a person’s interests. In simple terms, an AI agent is a smart program that can see, think,
and act to reach a goal.","status":"completed","iterationCount":1,"toolCallCount":0}}%                                                                                      



curl -X POST \
http://localhost:4000/api/conversations/656e8b70-60c9-4881-972b-27d2db94898e/agent-runs \
-H "Content-Type: application/json" \
-H "x-user-id: 3cbf2643-de3e-424f-9c4c-a0fec6b6e831" \
-d '{
"message": "What was the calculation I asked you to perform earlier?"
}'