// LIVE CHAT ROOMS — the one repository in src/lib/data that stores nothing.
//
// A room is a conversation between somebody inside a studio and nompany. It
// lives ONLY in Redis, under `chat:*`, with a TTL on every key: two hours idle
// while it is running, five minutes after either side ends it so both can grab
// the transcript, and then nothing. There is no collection, no registry row and
// no cascade entry, because there is nothing durable to delete.
//
// That is a product decision, not an oversight: a support conversation can
// carry anything a studio's people happen to type, and the safest place to keep
// that is nowhere. Whoever needs a record downloads one (see chatTranscript.js);
// the platform keeps none.
//
// The room document:
//   { id, studioId, studioName, studioSlug, userId, userName,
//     status: waiting|active|ended, adminId, adminLabel,
//     messages: [{ from: "studio"|"nompany", text, at }],
//     createdAt, lastAt }

import { CHAT, ID } from "@/platform/db/keys";
import {
  getJSON, setJSONEx, editJSON, touchTTL, claim, delKeys, sAdd, sRem, sMembers,
} from "@/platform/db/store";
// The vocabulary is shared with the client — a status string means the same
// thing in the widget as it does here, so there is exactly one definition of it.
import { WAITING, ACTIVE, ENDED, STUDIO, NOMPANY } from "@/lib/chatConstants";
import { emitPlatform, PLATFORM } from "@/lib/data/events";
import { notifySuper, NOTIFY } from "@/lib/data/notifications";

// Idle life of a running room. Every message re-arms it (see touchTTL below),
// so this is "nobody has said anything for two hours", not "two hours total".
export const ROOM_TTL_SEC = 60 * 60 * 2;
// The grace window after End Chat. Long enough for both sides to notice and
// download, short enough that a finished conversation is not lying around.
export const ENDED_TTL_SEC = 60 * 5;

// Re-exported so a server caller that already imports the repository does not
// need a second import to name a status or a side.
export { WAITING, ACTIVE, ENDED, STUDIO, NOMPANY };

const MAX_TEXT = 4000;
// A cap, not a policy — the TTL is what actually bounds a room. This stops one
// runaway client from growing a single Redis value without limit.
const MAX_MESSAGES = 1000;

const now = () => new Date().toISOString();
const trim = (v, max) => String(v ?? "").trim().slice(0, max);

export async function getRoom(roomId) {
  return roomId ? getJSON(CHAT.room(roomId)) : null;
}

// Open a room, or hand back the one this person already has open in this studio.
// Reopening the widget must not queue a second conversation: the console would
// see two identical waiting chats and the person would have split their own
// thread in half without meaning to.
export async function openRoom({ studio, userId, userName }) {
  const existing = await findLiveRoom(studio.id, userId);
  if (existing) return existing;

  const at = now();
  const room = {
    id: ID.chatRoom(),
    studioId: studio.id,
    studioName: trim(studio.name, 160),
    studioSlug: trim(studio.slug, 80),
    userId,
    userName: trim(userName, 120) || "Studio member",
    status: WAITING,
    adminId: "",
    adminLabel: "",
    messages: [],
    createdAt: at,
    lastAt: at,
  };
  await setJSONEx(CHAT.room(room.id), room, ROOM_TTL_SEC);
  await sAdd(CHAT.live, room.id);

  // The one platform event that is genuinely urgent: a person is waiting, right
  // now, for someone at nompany to answer. Unlike a signup this DOES ring the
  // bell — and the early return above means it rings once per conversation, not
  // once per time the widget is reopened.
  await emitPlatform({
    type: PLATFORM.chatWaiting,
    title: "Someone is waiting in chat",
    body: `${room.userName} — ${room.studioName}`,
    href: "/super/application/chat",
    refId: room.id,
  });
  await notifySuper({
    type: NOTIFY.system,
    title: "Live chat request",
    body: `${room.userName} from ${room.studioName} is waiting.`,
    href: "/super/application/chat",
    tone: "warning",
  });

  return room;
}

// Append a line. Atomic, and keepTTL so the countdown is not reset to "no
// expiry" by the write itself — the deliberate re-arm follows it.
export async function addMessage(roomId, from, text) {
  const body = trim(text, MAX_TEXT);
  if (!body) return getRoom(roomId);

  const updated = await editJSON(CHAT.room(roomId), (cur) => {
    if (!cur || cur.status === ENDED) return { result: cur || null };
    const at = now();
    const messages = [...(cur.messages || []), { from: from === NOMPANY ? NOMPANY : STUDIO, text: body, at }]
      .slice(-MAX_MESSAGES);
    const next = { ...cur, messages, lastAt: at };
    return { next, result: next };
  }, { keepTTL: true });

  if (updated && updated.status !== ENDED) await touchTTL(CHAT.room(roomId), ROOM_TTL_SEC);
  return updated;
}

// FIRST WINS. The NX claim is the whole mechanism: two admins clicking Accept at
// the same instant both reach this, exactly one gets the key, and the loser is
// told who has it rather than silently taking over a conversation.
export async function acceptRoom(roomId, { adminId, adminLabel }) {
  const room = await getRoom(roomId);
  if (!room) return { error: "not-found" };
  if (room.status === ENDED) return { error: "ended" };

  if (!(await claim(CHAT.held(roomId), adminId, ROOM_TTL_SEC))) {
    const current = await getRoom(roomId);
    // Re-accepting your own room is a no-op, not a collision — a reload should
    // not lock you out of the chat you are already handling.
    if (current?.adminId === adminId) return { room: current };
    return { taken: true, room: current };
  }

  const updated = await editJSON(CHAT.room(roomId), (cur) => {
    if (!cur) return { result: null };
    const next = { ...cur, status: ACTIVE, adminId, adminLabel: trim(adminLabel, 160), lastAt: now() };
    return { next, result: next };
  }, { keepTTL: true });

  if (!updated) return { error: "not-found" };
  await touchTTL(CHAT.room(roomId), ROOM_TTL_SEC);
  return { room: updated };
}

// Either side may end it. The room flips to `ended` and its TTL is SHORTENED to
// the grace window, so the transcript is still downloadable for a few minutes
// and then expires on its own. It leaves the live set immediately, so neither
// the console queue nor a stale poll shows a finished conversation.
export async function endRoom(roomId) {
  const updated = await editJSON(CHAT.room(roomId), (cur) => {
    if (!cur) return { result: null };
    if (cur.status === ENDED) return { result: cur };
    const next = { ...cur, status: ENDED, lastAt: now() };
    return { next, result: next };
  }, { keepTTL: true });

  await sRem(CHAT.live, roomId);
  await delKeys(CHAT.held(roomId));
  if (updated) await touchTTL(CHAT.room(roomId), ENDED_TTL_SEC);
  return updated;
}

// Every room still in play, newest activity first. Ids whose room has expired
// or ended are dropped from the set as we pass them — the set is a convenience
// index, and Redis' TTL, not this function, is what retires a room.
export async function listRooms() {
  const ids = await sMembers(CHAT.live);
  const rooms = [];
  for (const id of ids) {
    const room = await getRoom(id);
    if (!room || room.status === ENDED) {
      await sRem(CHAT.live, id);
      continue;
    }
    rooms.push(room);
  }
  return rooms.sort((a, b) => String(b.lastAt || "").localeCompare(String(a.lastAt || "")));
}

// The room this person already has open in this studio, if any. Scoped to BOTH
// ids: two people in one studio each get their own conversation, and one person
// in two studios does too — the console has to be able to tell them apart.
export async function findLiveRoom(studioId, userId) {
  const rooms = await listRooms();
  return rooms.find((r) => r.studioId === studioId && r.userId === userId) || null;
}
