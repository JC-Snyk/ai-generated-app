import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from './config';
import { documentTools } from './tools';

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

let client: Anthropic | undefined;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/** Answer a question about the uploaded documents. */
export async function askAboutDocuments(question: string): Promise<string> {
  const model = aiConfig.models.assistant;

  const finalMessage = await getClient().beta.messages.toolRunner({
    model: model.id,
    max_tokens: model.maxTokens,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    output_config: { effort: model.effort },
    tools: documentTools,
    max_iterations: aiConfig.agents.assistant.maxIterations,
    messages: [{ role: 'user', content: question }],
  });

  if (finalMessage.stop_reason === 'refusal') {
    return 'The model declined to answer that request.';
  }

  return finalMessage.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}
