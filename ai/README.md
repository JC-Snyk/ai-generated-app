# AI Components

The AI features of the PDF vault. Every component here is real, runnable code —
the point is that a Snyk AI-BOM scan (and Evo by Snyk) discovers it as an AI asset.

## What's here

| File | Component | Evo asset type |
| --- | --- | --- |
| `ai-config.json` | Declared model inventory | Models |
| `agent.ts` | Vault assistant, built on the Anthropic SDK tool runner | Agent (see note) |
| `triage-agent.ts` | Upload classifier, built as a LangGraph ReAct agent | Agents |
| `tools.ts` | The three vault tools, shared by both surfaces | Tools |
| `mcp-server.ts` | MCP server exposing the vault over stdio | MCP servers, Tools |
| `documents.ts` | Upload-vault access used by the tools | — |
| `routes.ts` | HTTP surface, mounted at `/ai` | — |

Two different agent frameworks are used on purpose, so the inventory shows more
than one pattern:

- **`agent.ts`** answers questions about uploaded documents. It uses
  `client.beta.messages.toolRunner` from the official Anthropic SDK. The AI-BOM
  scanner catalogues its model and tools but does not currently classify the
  tool runner itself as an Agent asset — it recognises agent libraries.
- **`triage-agent.ts`** classifies a single upload. It uses LangGraph's
  `createReactAgent`, which the scanner does report as an Agent.

## Models

| Model | Used by | Why |
| --- | --- | --- |
| `claude-opus-5` | Vault assistant | Open-ended reasoning over document content |
| `claude-haiku-4-5` | Upload triage | One cheap label per upload |

Model IDs live in `ai-config.json` rather than scattered through the code, so the
scanner and a human reader see the same list.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /ai/status` | Which AI components are wired up. Never calls the API. |
| `POST /ai/ask` | `{"question": "..."}` → the assistant's answer. |
| `GET /ai/triage/:filename` | Classify one uploaded document. |

`/ai/ask` and `/ai/triage` return **503** until `ANTHROPIC_API_KEY` is set. The
rest of the app runs without it.

## MCP server

`ai/mcp-server.js` serves the same three tools over stdio to any MCP client;
`.mcp.json` at the repo root is a ready-to-use client config.

```bash
npm run mcp
```

Tools are registered with the `server.tool(...)` overload rather than
`registerTool(...)`. The MCP SDK marks it deprecated, but it is the form Snyk's
AI-BOM scanner recognises, so each tool appears as its own Tool asset.

## A note on the vulnerability demo

The tools take a filename from a model, which is untrusted input, so
`documents.ts` confines every read to the upload directory. The Path Traversal
vulnerability this repo demonstrates lives in `index.ts` — it is deliberately
left alone.
