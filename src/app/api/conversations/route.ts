import { db } from '@/db';
import { conversations } from '@/db/schema';
import { getOwner } from '@/lib/session';
import { and, desc, eq } from 'drizzle-orm';
export async function GET() {
  try { const owner = await getOwner(); return Response.json(await db.select().from(conversations).where(eq(conversations.owner, owner)).orderBy(desc(conversations.updatedAt))); }
  catch { return Response.json({ error: 'Conversation history is temporarily unavailable.' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  const owner = await getOwner();
  const { id } = await request.json();
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Invalid conversation.' }, { status: 400 });
  await db.delete(conversations).where(and(eq(conversations.owner, owner), eq(conversations.id, id)));
  return Response.json({ success: true });
}
