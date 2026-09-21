import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { listDocuments, readDocument, searchDocuments } from './documents';

/**
 * Tool definitions for the upload vault.
 *
 * The Zod shapes and handlers are declared once here and reused by both
 * tool-calling surfaces: the Claude agent (`ai/agent.ts`) and the MCP server
 * (`ai/mcp-server.ts`).
 */

export const listDocumentsShape = {};

export const readDocumentShape = {
  filename: z.string().describe('Name of an uploaded file, as returned by list_documents.'),
  maxChars: z
    .number()
    .int()
    .positive()
    .max(50000)
    .optional()
    .describe('Maximum number of characters to return. Defaults to 20000.'),
};

export const searchDocumentsShape = {
  query: z.string().describe('Case-insensitive text to look for across all uploaded documents.'),
};

export const handlers = {
  listDocuments(): string {
    const docs = listDocuments();
    if (docs.length === 0) {
      return 'No documents have been uploaded yet.';
    }
    return docs
      .map((doc) => `${doc.filename} (${doc.sizeBytes} bytes, uploaded ${doc.uploadedAt})`)
      .join('\n');
  },

  readDocument(input: { filename: string; maxChars?: number }): string {
    return readDocument(input.filename, input.maxChars);
  },

  searchDocuments(input: { query: string }): string {
    const hits = searchDocuments(input.query);
    if (hits.length === 0) {
      return `No document contains "${input.query}".`;
    }
    return hits.map((hit) => `${hit.filename}: ...${hit.excerpt}...`).join('\n\n');
  },
};

/** Tool descriptions, shared between the agent and the MCP server. */
export const toolDescriptions = {
  list_documents: 'List every PDF currently held in the upload vault, newest first.',
  read_document:
    'Read the extractable text of one uploaded document. Scanned or compressed PDFs may return little text.',
  search_documents: 'Search the text of every uploaded document for a phrase and return matching excerpts.',
};

/** Runnable tools for the Claude agent loop. */
export const documentTools = [
  betaZodTool({
    name: 'list_documents',
    description: toolDescriptions.list_documents,
    inputSchema: z.object(listDocumentsShape),
    run: async () => handlers.listDocuments(),
  }),
  betaZodTool({
    name: 'read_document',
    description: toolDescriptions.read_document,
    inputSchema: z.object(readDocumentShape),
    run: async (input) => handlers.readDocument(input),
  }),
  betaZodTool({
    name: 'search_documents',
    description: toolDescriptions.search_documents,
    inputSchema: z.object(searchDocumentsShape),
    run: async (input) => handlers.searchDocuments(input),
  }),
];
