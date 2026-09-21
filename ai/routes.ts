import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { aiConfig, isConfigured } from './config';
import { askAboutDocuments } from './agent';
import { triageDocument } from './triage-agent';

/** HTTP surface for the AI features, mounted at /ai by index.ts. */
export const aiRouter = express.Router();

/**
 * Error responses carry a fixed message and are always sent with res.json.
 *
 * No exception text reaches the client: an upstream or filesystem error can
 * embed caller-supplied input, and a plain string body is served as text/html,
 * so echoing it back would let that input render in the browser. Details go to
 * the server log instead.
 */
function reportError(res: express.Response, error: unknown): void {
  console.error('AI route error:', error);

  if (error instanceof Anthropic.AuthenticationError) {
    res.status(503).json({ error: 'The Anthropic API rejected the configured credential.' });
  } else if (error instanceof Anthropic.RateLimitError) {
    res.status(429).json({ error: 'Rate limited by the Anthropic API. Try again shortly.' });
  } else if (error instanceof Anthropic.APIError) {
    res.status(502).json({ error: 'The Anthropic API returned an error.' });
  } else {
    res.status(400).json({ error: 'The request could not be completed.' });
  }
}

/** Reports which AI components are wired up, without calling the API. */
aiRouter.get('/status', (_req, res) => {
  res.json({
    configured: isConfigured(),
    agents: aiConfig.agents,
    models: aiConfig.models,
    mcpServer: aiConfig.mcpServer,
  });
});

/** Ask the assistant agent a question about the uploaded documents. */
aiRouter.post('/ask', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) {
    return res.status(400).json({ error: 'Provide a "question" field.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Set ANTHROPIC_API_KEY to enable the assistant.' });
  }

  try {
    res.json({ answer: await askAboutDocuments(question) });
  } catch (error) {
    reportError(res, error);
  }
});

/** Classify one uploaded document. */
aiRouter.get('/triage/:filename', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Set ANTHROPIC_API_KEY to enable triage.' });
  }

  try {
    res.json(await triageDocument(req.params.filename));
  } catch (error) {
    reportError(res, error);
  }
});
