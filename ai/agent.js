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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.askAboutDocuments = askAboutDocuments;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("./config");
const tools_1 = require("./tools");
/**
 * The PDF Vault assistant: a tool-calling agent that answers questions about
 * the documents users have uploaded. The SDK's tool runner drives the loop,
 * calling the tools in `ai/tools.ts` until Claude has an answer.
 */
const SYSTEM_PROMPT = [
    'You are the PDF Vault assistant for a document upload service.',
    'Answer questions about the uploaded documents using the provided tools.',
    'Only describe content you actually read from a tool result - never guess at a',
    'document you have not opened. If the vault is empty or a document has no',
    'extractable text, say so plainly.',
].join(' ');
let client;
function getClient() {
    if (!client) {
        client = new sdk_1.default();
    }
    return client;
}
/** Answer a question about the uploaded documents. */
function askAboutDocuments(question) {
    return __awaiter(this, void 0, void 0, function* () {
        const model = config_1.aiConfig.models.assistant;
        const finalMessage = yield getClient().beta.messages.toolRunner({
            model: model.id,
            max_tokens: model.maxTokens,
            system: SYSTEM_PROMPT,
            thinking: { type: 'adaptive' },
            output_config: { effort: model.effort },
            tools: tools_1.documentTools,
            max_iterations: config_1.aiConfig.agents.assistant.maxIterations,
            messages: [{ role: 'user', content: question }],
        });
        if (finalMessage.stop_reason === 'refusal') {
            return 'The model declined to answer that request.';
        }
        return finalMessage.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();
    });
}
