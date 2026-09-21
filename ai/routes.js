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
exports.aiRouter = void 0;
const express_1 = __importDefault(require("express"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("./config");
const agent_1 = require("./agent");
const triage_agent_1 = require("./triage-agent");
/** HTTP surface for the AI features, mounted at /ai by index.ts. */
exports.aiRouter = express_1.default.Router();
/**
 * Error responses carry a fixed message and are always sent with res.json.
 *
 * No exception text reaches the client: an upstream or filesystem error can
 * embed caller-supplied input, and a plain string body is served as text/html,
 * so echoing it back would let that input render in the browser. Details go to
 * the server log instead.
 */
function reportError(res, error) {
    console.error('AI route error:', error);
    if (error instanceof sdk_1.default.AuthenticationError) {
        res.status(503).json({ error: 'The Anthropic API rejected the configured credential.' });
    }
    else if (error instanceof sdk_1.default.RateLimitError) {
        res.status(429).json({ error: 'Rate limited by the Anthropic API. Try again shortly.' });
    }
    else if (error instanceof sdk_1.default.APIError) {
        res.status(502).json({ error: 'The Anthropic API returned an error.' });
    }
    else {
        res.status(400).json({ error: 'The request could not be completed.' });
    }
}
/** Reports which AI components are wired up, without calling the API. */
exports.aiRouter.get('/status', (_req, res) => {
    res.json({
        configured: (0, config_1.isConfigured)(),
        agents: config_1.aiConfig.agents,
        models: config_1.aiConfig.models,
        mcpServer: config_1.aiConfig.mcpServer,
    });
});
/** Ask the assistant agent a question about the uploaded documents. */
exports.aiRouter.post('/ask', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const question = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.question) === 'string' ? req.body.question.trim() : '';
    if (!question) {
        return res.status(400).json({ error: 'Provide a "question" field.' });
    }
    if (!(0, config_1.isConfigured)()) {
        return res.status(503).json({ error: 'Set ANTHROPIC_API_KEY to enable the assistant.' });
    }
    try {
        res.json({ answer: yield (0, agent_1.askAboutDocuments)(question) });
    }
    catch (error) {
        reportError(res, error);
    }
}));
/** Classify one uploaded document. */
exports.aiRouter.get('/triage/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, config_1.isConfigured)()) {
        return res.status(503).json({ error: 'Set ANTHROPIC_API_KEY to enable triage.' });
    }
    try {
        res.json(yield (0, triage_agent_1.triageDocument)(req.params.filename));
    }
    catch (error) {
        reportError(res, error);
    }
}));
