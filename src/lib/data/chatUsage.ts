import { getRedisClient } from "@/platform/db/redis";
import { S } from "@/platform/db/keys";

// How many live chats a studio has started this month, against what its package
// allows.
//
// Counted per CALENDAR MONTH, in UTC, because that is what "per month" means on
// an invoice — not a rolling thirty days. The month is the hash field, so
// nothing has to be reset: a new month is simply a field nobody has written to
// yet, and the old ones stay readable.
//
// An allowance of 0 means UNLIMITED, the same convention every other cap in the
// catalogue uses.

export const monthKey = (d = new Date()) => new Date(d).toISOString().slice(0, 7);

export async function chatsUsed(studioId: string | null | undefined, month = monthKey()) {
  if (!studioId) return 0;
  try {
    const client = await getRedisClient();
    const v = await client.hGet(S.chatUsage(studioId), month);
    return Number(v) || 0;
  } catch { return 0; }
}

// Counted when a chat is STARTED, not when it ends: the allowance is on opening
// a conversation, and a chat that is abandoned still occupied someone.
export async function recordChatStart(studioId: string | null | undefined, month = monthKey()) {
  if (!studioId) return 0;
  try {
    const client = await getRedisClient();
    return Number(await client.hIncrBy(S.chatUsage(studioId), month, 1)) || 0;
  } catch { return 0; }
}

// The whole answer in one shape, so the shell and the API cannot compute
// "remaining" differently.
export function allowanceOf(used: unknown, allowed: unknown) {
  const cap = Number(allowed) || 0;
  const spent = Number(used) || 0;
  // NULL, not Infinity, for unlimited. This object is handed from a server
  // component to a client one, and JSON has no Infinity — it would arrive as
  // null anyway, so it may as well say so honestly.
  if (cap <= 0) return { unlimited: true, allowed: 0, used: spent, remaining: null, exhausted: false };
  const remaining = Math.max(0, cap - spent);
  return { unlimited: false, allowed: cap, used: spent, remaining, exhausted: remaining === 0 };
}
