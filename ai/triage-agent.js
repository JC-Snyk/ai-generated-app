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
exports.CATEGORIES = void 0;
exports.triageDocument = triageDocument;
const anthropic_1 = require("@langchain/anthropic");
const tools_1 = require("@langchain/core/tools");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const zod_1 = require("zod");
const config_1 = require("./config");
const tools_2 = require("./tools");
/**
 * Upload triage agent.
 *
 * A second, deliberately different agent implementation: where the assistant
 * in `ai/agent.ts` uses the Anthropic SDK's tool runner, this one is a LangGraph
 * ReAct agent. It runs on a smaller model because the job is a single label.
 */
exports.CATEGORIES = ['invoice', 'contract', 'resume', 'report', 'other'];
const SYSTEM_PROMPT = [
    'You classify documents held in a PDF upload vault.',
    'Read the document with the tools before deciding.',
    `Choose exactly one category: ${exports.CATEGORIES.join(', ')}.`,
    'Reply with a single line in the form "category: one short sentence of reasoning".',
    'Use "other" when the text is unreadable or fits nothing else.',
].join(' ');
const listDocumentsTool = (0, tools_1.tool)(() => __awaiter(void 0, void 0, void 0, function* () { return tools_2.handlers.listDocuments(); }), {
    name: 'list_documents',
    description: tools_2.toolDescriptions.list_documents,
    schema: zod_1.z.object(tools_2.listDocumentsShape),
});
const readDocumentTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () { return tools_2.handlers.readDocument(input); }), {
    name: 'read_document',
    description: tools_2.toolDescriptions.read_document,
    schema: zod_1.z.object(tools_2.readDocumentShape),
});
let agent;
function getTriageAgent() {
    if (!agent) {
        const modelConfig = config_1.aiConfig.models[config_1.aiConfig.agents.triage.model];
        agent = (0, prebuilt_1.createReactAgent)({
            llm: new anthropic_1.ChatAnthropic({
                model: modelConfig.id,
                maxTokens: modelConfig.maxTokens,
            }),
            tools: [listDocumentsTool, readDocumentTool],
            prompt: SYSTEM_PROMPT,
        });
    }
    return agent;
}
function triageDocument(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const result = yield getTriageAgent().invoke({ messages: [{ role: 'user', content: `Classify the uploaded document "${filename}".` }] }, { recursionLimit: config_1.aiConfig.agents.triage.maxIterations * 2 });
        const lastMessage = result.messages[result.messages.length - 1];
        const text = typeof (lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.content) === 'string'
            ? lastMessage.content.trim()
            : JSON.stringify((_a = lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.content) !== null && _a !== void 0 ? _a : '');
        const [rawCategory, ...rest] = text.split(':');
        const category = exports.CATEGORIES.find((candidate) => candidate === rawCategory.trim().toLowerCase());
        return {
            filename,
            category: category !== null && category !== void 0 ? category : 'other',
            reason: rest.join(':').trim() || text,
        };
    });
}
