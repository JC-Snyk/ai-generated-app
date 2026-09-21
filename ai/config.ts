import fs from 'fs';
import path from 'path';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelConfig {
  id: string;
  provider: string;
  role: string;
  maxTokens: number;
  effort?: Effort;
}

export interface AgentConfig {
  name: string;
  /** Which library drives the agent loop. */
  framework: string;
  /** Key into `models` for the model this agent runs on. */
  model: 'assistant' | 'triage';
  maxIterations: number;
}

export interface AiConfig {
  models: {
    assistant: ModelConfig;
    triage: ModelConfig;
  };
  agents: {
    assistant: AgentConfig;
    triage: AgentConfig;
  };
  mcpServer: {
    name: string;
    version: string;
  };
}

/**
 * Declarative inventory of the AI components this app uses. Keeping the model
 * IDs in a config file (rather than scattered through the code) means the
 * AI-BOM scanner and a human reader see the same list.
 */
export const aiConfig: AiConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ai-config.json'), 'utf8')
) as AiConfig;

/** True when a credential is available for the Anthropic API. */
export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
