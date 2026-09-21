"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiConfig = void 0;
exports.isConfigured = isConfigured;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Declarative inventory of the AI components this app uses. Keeping the model
 * IDs in a config file (rather than scattered through the code) means the
 * AI-BOM scanner and a human reader see the same list.
 */
exports.aiConfig = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, 'ai-config.json'), 'utf8'));
/** True when a credential is available for the Anthropic API. */
function isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
