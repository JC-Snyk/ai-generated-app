export type ShelfLabel = {
  displayName: string;
  category: string;
  emoji: string;
  oneLiner: string;
};

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

function parseShelfLabel(content: string): ShelfLabel {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Model did not return JSON');
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<ShelfLabel>;
  if (
    typeof parsed.displayName !== 'string' ||
    typeof parsed.category !== 'string' ||
    typeof parsed.emoji !== 'string' ||
    typeof parsed.oneLiner !== 'string'
  ) {
    throw new Error('Model returned incomplete shelf label');
  }
  return {
    displayName: parsed.displayName.slice(0, 120),
    category: parsed.category.slice(0, 60),
    emoji: parsed.emoji.slice(0, 8),
    oneLiner: parsed.oneLiner.slice(0, 280),
  };
}

export async function generateShelfLabel(
  originalFilename: string,
  storageId: string,
  userHint: string
): Promise<ShelfLabel> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const systemPrompt =
    'You are a friendly digital librarian. Given a PDF upload, invent a memorable shelf label. ' +
    'Respond with JSON only, no markdown, using keys: displayName (short title), category (e.g. Finance, Legal), ' +
    'emoji (single emoji), oneLiner (one sentence describing likely use).';

  const userPrompt = JSON.stringify({
    originalFilename,
    storageId,
    userHint: userHint || 'No hint provided — infer from filename only.',
  });

  const response = await fetch(GROQ_CHAT_URL, {
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
    const detail = await response.text();
    throw new Error(`Groq API error (${response.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Groq');
  }

  return parseShelfLabel(content);
}
