# LLM Loop Visualizer

A full-stack TypeScript tool to inspect multi-turn LLM execution loops from audit logs.

## What it visualizes

- Each loop step (request -> response)
- Trigger message that caused the next model call
- Latest user question in that turn context
- Assistant response text and finish reason
- Tool calls emitted by the model
- Token usage (prompt/completion/total)
- Request message role histogram

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript

## Quick start

1. Install dependencies:

   npm install

2. Start frontend + backend:

   npm run dev

3. Open frontend:

   http://localhost:5173

## Data input methods

Inside the UI, you can choose any of these:

- Upload a JSON file
- Input a local file path for backend to read
- Paste raw JSON content

## Sample log

A sample log is copied to:

- sample/llm_response_audit.json

You can test by setting file path to:

- /absolute/path/to/your/project/sample/llm_response_audit.json

## API

- GET /api/health
- POST /api/parse
  - body: { "content": "...json string..." }
- POST /api/load-file
  - body: { "filePath": "/absolute/path/to/log.json" }
