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
exports.generateShelfLabel = generateShelfLabel;
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
function parseShelfLabel(content) {
    const trimmed = content.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Model did not return JSON');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.displayName !== 'string' ||
        typeof parsed.category !== 'string' ||
        typeof parsed.emoji !== 'string' ||
        typeof parsed.oneLiner !== 'string') {
        throw new Error('Model returned incomplete shelf label');
    }
    return {
        displayName: parsed.displayName.slice(0, 120),
        category: parsed.category.slice(0, 60),
        emoji: parsed.emoji.slice(0, 8),
        oneLiner: parsed.oneLiner.slice(0, 280),
    };
}
function generateShelfLabel(originalFilename, storageId, userHint) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not configured');
        }
        const systemPrompt = 'You are a friendly digital librarian. Given a PDF upload, invent a memorable shelf label. ' +
            'Respond with JSON only, no markdown, using keys: displayName (short title), category (e.g. Finance, Legal), ' +
            'emoji (single emoji), oneLiner (one sentence describing likely use).';
        const userPrompt = JSON.stringify({
            originalFilename,
            storageId,
            userHint: userHint || 'No hint provided — infer from filename only.',
        });
        const response = yield fetch(GROQ_CHAT_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                temperature: 0.7,
                max_tokens: 256,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        });
        if (!response.ok) {
            const detail = yield response.text();
            throw new Error(`Groq API error (${response.status}): ${detail.slice(0, 200)}`);
        }
        const body = (yield response.json());
        const content = (_c = (_b = (_a = body.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
        if (!content) {
            throw new Error('Empty response from Groq');
        }
        return parseShelfLabel(content);
    });
}
