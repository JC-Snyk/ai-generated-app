#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { aiConfig } from './config';
import {
  handlers,
  listDocumentsShape,
  readDocumentShape,
  searchDocumentsShape,
  toolDescriptions,
} from './tools';

/**
 * MCP server exposing the upload vault to any MCP client (Claude Code, an IDE
 * assistant, another agent). It serves the same tools as the in-app agent, so
 * the vault has one tool surface rather than two.
 */

const server = new McpServer({
  name: aiConfig.mcpServer.name,
  version: aiConfig.mcpServer.version,
});

function asToolResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

// Note: these use the `server.tool(name, description, schema, handler)` overload.
// The MCP SDK marks it deprecated in favour of `registerTool`, but Snyk's AI-BOM
// scanner recognises this form, so each tool shows up as a Tool asset in Evo.
server.tool(
  'list_documents',
  toolDescriptions.list_documents,
  listDocumentsShape,
  async () => asToolResult(handlers.listDocuments())
);

server.tool(
  'read_document',
  toolDescriptions.read_document,
  readDocumentShape,
  async (input) => asToolResult(handlers.readDocument(input))
);

server.tool(
  'search_documents',
  toolDescriptions.search_documents,
  searchDocumentsShape,
  async (input) => asToolResult(handlers.searchDocuments(input))
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  // stdout is the MCP transport - log to stderr only.
  console.error(`${aiConfig.mcpServer.name} MCP server listening on stdio`);
}

main().catch((error) => {
  console.error('MCP server failed to start:', error);
  process.exit(1);
});
