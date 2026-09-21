#!/usr/bin/env node
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
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const config_1 = require("./config");
const tools_1 = require("./tools");
/**
 * MCP server exposing the upload vault to any MCP client (Claude Code, an IDE
 * assistant, another agent). It serves the same tools as the in-app agent, so
 * the vault has one tool surface rather than two.
 */
const server = new mcp_js_1.McpServer({
    name: config_1.aiConfig.mcpServer.name,
    version: config_1.aiConfig.mcpServer.version,
});
function asToolResult(text) {
    return { content: [{ type: 'text', text }] };
}
// Note: these use the `server.tool(name, description, schema, handler)` overload.
// The MCP SDK marks it deprecated in favour of `registerTool`, but Snyk's AI-BOM
// scanner recognises this form, so each tool shows up as a Tool asset in Evo.
server.tool('list_documents', tools_1.toolDescriptions.list_documents, tools_1.listDocumentsShape, () => __awaiter(void 0, void 0, void 0, function* () { return asToolResult(tools_1.handlers.listDocuments()); }));
server.tool('read_document', tools_1.toolDescriptions.read_document, tools_1.readDocumentShape, (input) => __awaiter(void 0, void 0, void 0, function* () { return asToolResult(tools_1.handlers.readDocument(input)); }));
server.tool('search_documents', tools_1.toolDescriptions.search_documents, tools_1.searchDocumentsShape, (input) => __awaiter(void 0, void 0, void 0, function* () { return asToolResult(tools_1.handlers.searchDocuments(input)); }));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield server.connect(new stdio_js_1.StdioServerTransport());
        // stdout is the MCP transport - log to stderr only.
        console.error(`${config_1.aiConfig.mcpServer.name} MCP server listening on stdio`);
    });
}
main().catch((error) => {
    console.error('MCP server failed to start:', error);
    process.exit(1);
});
