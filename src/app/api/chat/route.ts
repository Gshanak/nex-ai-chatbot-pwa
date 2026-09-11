import { db } from '@/db';
import { conversations, type ChatMessage } from '@/db/schema';
import { getOwner } from '@/lib/session';
import { providers, type Provider } from '@/lib/models';
import { and, eq } from 'drizzle-orm';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, model, apiKey, conversationId } = body;
    if (!providers.includes(provider) || typeof model !== 'string' || !model.trim() || model.length > 150) return Response.json({ error: 'Choose a valid provider and model.' }, { status: 400 });
    const messages: ChatMessage[] = body.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 100 || messages.some(m => !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 50000)) return Response.json({ error: 'The conversation is too long or invalid. Please start a new chat.' }, { status: 400 });
    const owner = await getOwner();
    if (conversationId) {
      if (typeof conversationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(conversationId)) return Response.json({ error: 'Invalid conversation.' }, { status: 400 });
      const [existing] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.owner, owner)));
      if (!existing) return Response.json({ error: 'Conversation not found.' }, { status: 404 });
    }
    const envKeys: Record<Provider, string | undefined> = { openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY, openrouter: process.env.OPENROUTER_API_KEY };
    const key = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : envKeys[provider as Provider];
    if (!key) return Response.json({ error: `Connect your ${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} API key in Model settings to start chatting.`, needsKey: true }, { status: 401 });
    const temperature = Math.max(0, Math.min(1, Number(body.temperature) || 0));
    const maxTokens = Math.max(256, Math.min(8192, Number(body.maxTokens) || 2048));
    const system = typeof body.systemPrompt === 'string' ? body.systemPrompt.slice(0, 10000) : 'You are a helpful assistant.';
    const anthropic = provider === 'anthropic';
    const url = anthropic ? 'https://api.anthropic.com/v1/messages' : provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (anthropic) { headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01'; }
    else { headers.Authorization = `Bearer ${key}`; if(provider === 'openrouter') headers['X-Title'] = 'Nex AI'; }
    const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model, temperature, max_tokens: maxTokens, ...(anthropic ? { system, messages } : { messages: [{ role: 'system', content: system }, ...messages] }) }), signal: AbortSignal.timeout(55000) });
    const data = await upstream.json();
    if (!upstream.ok) return Response.json({ error: data.error?.message || 'The provider could not complete your request. Check your model and API key.' }, { status: upstream.status === 429 ? 429 : 502 });
    const content = anthropic ? data.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') : data.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: 'The model returned an empty response. Please try again.' }, { status: 502 });
    const allMessages: ChatMessage[] = [...messages, { role: 'assistant', content }];
    let id = conversationId;
    if (id) await db.update(conversations).set({ messages: allMessages, model, updatedAt: new Date() }).where(and(eq(conversations.id, id), eq(conversations.owner, owner)));
    else { const [created] = await db.insert(conversations).values({ owner, title: messages[0].content.slice(0, 65), model, messages: allMessages }).returning({ id: conversations.id }); id = created.id; }
    return Response.json({ content, conversationId: id });
  } catch (error) {
    return Response.json({ error: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'The model took too long to respond. Please try again.' : 'Could not complete your message. Check your connection and try again.' }, { status: 503 });
  }
}
