export const providers = ['openai', 'anthropic', 'openrouter'] as const;
export type Provider = typeof providers[number];
export const providerNames: Record<Provider, string> = { openai: 'OpenAI', anthropic: 'Anthropic', openrouter: 'OpenRouter' };
export const models: Record<Provider, { id: string; name: string; description: string }[]> = {
  openai: [ { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: 'Fast, thoughtful, and ready for every day' }, { id: 'gpt-4o', name: 'GPT-4o', description: 'Powerful intelligence for complex tasks' }, { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Precise writing, reasoning, and code' } ],
  anthropic: [ { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'A balanced creative and coding partner' }, { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Quick answers, clear thinking' } ],
  openrouter: [ { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', description: 'OpenAI intelligence through OpenRouter' }, { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic intelligence through OpenRouter' }, { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, versatile intelligence from Google' } ],
};
export type Settings = { provider: Provider; model: string; temperature: number; maxTokens: number; systemPrompt: string; name: string };
export const defaultSettings: Settings = { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048, systemPrompt: 'You are Nex, a warm, thoughtful AI companion. Give helpful, clear and beautifully structured answers. Be honest about your capabilities. You can provide design ideas, writing, travel plans and code, but do not claim to generate images or browse the web.', name: 'Alex' };
