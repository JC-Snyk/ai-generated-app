import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { aiConfig } from './config';
import { handlers, listDocumentsShape, readDocumentShape, toolDescriptions } from './tools';

/**
 * Upload triage agent.
 *
 * A second, deliberately different agent implementation: where the assistant
 * in `ai/agent.ts` uses the Anthropic SDK's tool runner, this one is a LangGraph
 * ReAct agent. It runs on a smaller model because the job is a single label.
 */

export const CATEGORIES = ['invoice', 'contract', 'resume', 'report', 'other'] as const;

export type UploadCategory = (typeof CATEGORIES)[number];

export interface TriageResult {
  filename: string;
  category: UploadCategory;
  reason: string;
}

const SYSTEM_PROMPT = [
  'You classify documents held in a PDF upload vault.',
  'Read the document with the tools before deciding.',
  `Choose exactly one category: ${CATEGORIES.join(', ')}.`,
  'Reply with a single line in the form "category: one short sentence of reasoning".',
  'Use "other" when the text is unreadable or fits nothing else.',
].join(' ');

const listDocumentsTool = tool(async () => handlers.listDocuments(), {
  name: 'list_documents',
  description: toolDescriptions.list_documents,
  schema: z.object(listDocumentsShape),
});

const readDocumentTool = tool(
  async (input: { filename: string; maxChars?: number }) => handlers.readDocument(input),
  {
    name: 'read_document',
    description: toolDescriptions.read_document,
    schema: z.object(readDocumentShape),
  }
);

let agent: ReturnType<typeof createReactAgent> | undefined;

function getTriageAgent() {
  if (!agent) {
    const modelConfig = aiConfig.models[aiConfig.agents.triage.model];
    agent = createReactAgent({
      llm: new ChatAnthropic({
        model: modelConfig.id,
        maxTokens: modelConfig.maxTokens,
      }),
      tools: [listDocumentsTool, readDocumentTool],
      prompt: SYSTEM_PROMPT,
    });
  }
  return agent;
}

export async function triageDocument(filename: string): Promise<TriageResult> {
  const result = await getTriageAgent().invoke(
    { messages: [{ role: 'user', content: `Classify the uploaded document "${filename}".` }] },
    { recursionLimit: aiConfig.agents.triage.maxIterations * 2 }
  );

  const lastMessage = result.messages[result.messages.length - 1];
  const text =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content.trim()
      : JSON.stringify(lastMessage?.content ?? '');

  const [rawCategory, ...rest] = text.split(':');
  const category = CATEGORIES.find(
    (candidate) => candidate === rawCategory.trim().toLowerCase()
  );

  return {
    filename,
    category: category ?? 'other',
    reason: rest.join(':').trim() || text,
  };
}
