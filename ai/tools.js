"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentTools = exports.toolDescriptions = exports.handlers = exports.searchDocumentsShape = exports.readDocumentShape = exports.listDocumentsShape = void 0;
const zod_1 = require("@anthropic-ai/sdk/helpers/beta/zod");
const zod_2 = require("zod");
const documents_1 = require("./documents");
/**
 * Tool definitions for the upload vault.
 *
 * The Zod shapes and handlers are declared once here and reused by both
 * tool-calling surfaces: the Claude agent (`ai/agent.ts`) and the MCP server
 * (`ai/mcp-server.ts`).
 */
exports.listDocumentsShape = {};
exports.readDocumentShape = {
    filename: zod_2.z.string().describe('Name of an uploaded file, as returned by list_documents.'),
    maxChars: zod_2.z
        .number()
        .int()
        .positive()
        .max(50000)
        .optional()
        .describe('Maximum number of characters to return. Defaults to 20000.'),
};
exports.searchDocumentsShape = {
    query: zod_2.z.string().describe('Case-insensitive text to look for across all uploaded documents.'),
};
exports.handlers = {
    listDocuments() {
        const docs = (0, documents_1.listDocuments)();
        if (docs.length === 0) {
            return 'No documents have been uploaded yet.';
        }
        return docs
            .map((doc) => `${doc.filename} (${doc.sizeBytes} bytes, uploaded ${doc.uploadedAt})`)
            .join('\n');
    },
    readDocument(input) {
        return (0, documents_1.readDocument)(input.filename, input.maxChars);
    },
    searchDocuments(input) {
        const hits = (0, documents_1.searchDocuments)(input.query);
        if (hits.length === 0) {
            return `No document contains "${input.query}".`;
        }
        return hits.map((hit) => `${hit.filename}: ...${hit.excerpt}...`).join('\n\n');
    },
};
/** Tool descriptions, shared between the agent and the MCP server. */
exports.toolDescriptions = {
    list_documents: 'List every PDF currently held in the upload vault, newest first.',
    read_document: 'Read the extractable text of one uploaded document. Scanned or compressed PDFs may return little text.',
    search_documents: 'Search the text of every uploaded document for a phrase and return matching excerpts.',
};
/** Runnable tools for the Claude agent loop. */
exports.documentTools = [
    (0, zod_1.betaZodTool)({
        name: 'list_documents',
        description: exports.toolDescriptions.list_documents,
        inputSchema: zod_2.z.object(exports.listDocumentsShape),
        run: () => __awaiter(void 0, void 0, void 0, function* () { return exports.handlers.listDocuments(); }),
    }),
    (0, zod_1.betaZodTool)({
        name: 'read_document',
        description: exports.toolDescriptions.read_document,
        inputSchema: zod_2.z.object(exports.readDocumentShape),
        run: (input) => __awaiter(void 0, void 0, void 0, function* () { return exports.handlers.readDocument(input); }),
    }),
    (0, zod_1.betaZodTool)({
        name: 'search_documents',
        description: exports.toolDescriptions.search_documents,
        inputSchema: zod_2.z.object(exports.searchDocumentsShape),
        run: (input) => __awaiter(void 0, void 0, void 0, function* () { return exports.handlers.searchDocuments(input); }),
    }),
];
