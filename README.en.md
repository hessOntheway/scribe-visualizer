# Scribe Visualizer

[中文](README.zh-CN.md) | [English](README.en.md)

Scribe Visualizer is a companion visualization tool for `scribe-engine`.

It visualizes multi-turn LLM execution logs so you can quickly inspect:

- Each loop step (request -> response)
- The trigger chain that leads to the next model call
- The latest user question in the current context
- Assistant response and finish reason
- Tool calls emitted by the model
- Token usage (prompt / completion / total)

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Start frontend and backend

```bash
npm run dev
```

3. Open the app

- http://localhost:5173

## Data Input Options

- Upload a JSON file
- Provide a local file path for backend loading
- Paste raw JSON content
