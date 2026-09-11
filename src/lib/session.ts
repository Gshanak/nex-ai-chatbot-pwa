import { cookies } from 'next/headers';
export async function getOwner() {
  const store = await cookies();
  let owner = store.get('nex-session')?.value;
  if (!owner) {
    owner = crypto.randomUUID();
    store.set('nex-session', owner, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  return owner;
}
