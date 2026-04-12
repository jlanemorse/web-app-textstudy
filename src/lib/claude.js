export const MODEL = 'claude-haiku-4-5-20251001';

export function getApiKey() {
  return localStorage.getItem('anthropic_api_key') ?? '';
}

export function saveApiKey(key) {
  localStorage.setItem('anthropic_api_key', key);
}

export async function generateCards({ topic, instructions, pasteText, images, apiKey }) {
  const parts = [];
  if (topic?.trim()) parts.push(`Generate flashcards about: ${topic.trim()}`);
  if (instructions?.trim()) parts.push(`Instructions: ${instructions.trim()}`);
  if (pasteText?.trim()) parts.push(`Source material to make cards from:\n${pasteText.trim().slice(0, 14000)}`);
  parts.push('Return ONLY a valid JSON array with no extra text: [{"front": "question", "back": "answer"}, ...]. Generate a thorough set covering all key facts, terms, and concepts.');

  const content = [
    ...(images ?? []).map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    })),
    { type: 'text', text: parts.join('\n\n') },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content }] }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No cards returned — try rephrasing.');
  return JSON.parse(match[0]);
}
