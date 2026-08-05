// Ephemeral live-chat state — stored ONLY in Redis with TTLs, never in the
// durable collections. Rooms auto-expire; End Chat keeps a short grace window so
// both sides can grab the transcript, then it's gone. No history is kept.
import crypto from "crypto";
import { getRedisClient } from "@/lib/db";
import { getSectionAccess } from "@/lib/sectionAccess";
import { can } from "@/lib/accessControl";
import { subjectFromUser } from "@/lib/sectionAccessConstants";
import { isTopic, CHAT_TOPICS } from "@/lib/chatConstants";

// Which chat topics a studio user is allowed to receive (from Access Control:
// the "chat" node's receive-sales / receive-support actions). Admin gets both.
export async function agentTopics(user) {
  if (!user) return [];
  const grants = await getSectionAccess();
  const subj = subjectFromUser(user);
  return CHAT_TOPICS.filter((t) => can(subj, "chat", t.action, grants)).map((t) => t.key);
}

const ROOM_TTL = 60 * 120; // 2h idle
const END_TTL = 60 * 5;    // 5 min grace after End Chat
const INDEX = "chat:index";
const roomKey = (id) => `chat:room:${id}`;
const agentKey = (id) => `chat:room:${id}:agent`;
const rid = () => `chat_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
const tok = () => crypto.randomBytes(16).toString("hex");

async function readRoom(client, id) {
  const raw = await client.get(roomKey(id));
  return raw ? JSON.parse(raw) : null;
}
async function writeRoom(client, room, ttl = ROOM_TTL) {
  await client.set(roomKey(room.id), JSON.stringify(room), { EX: ttl });
  await client.zAdd(INDEX, { score: Date.now(), value: room.id });
}

export async function createRoom({ topic, visitor, preset }) {
  if (!isTopic(topic)) throw new Error("Invalid topic");
  const client = await getRedisClient();
  const now = new Date().toISOString();
  const room = {
    id: rid(),
    topic,
    visitor: {
      name: String(visitor?.name || "").slice(0, 120),
      email: String(visitor?.email || "").slice(0, 160),
      phone: String(visitor?.phone || "").slice(0, 60),
      company: String(visitor?.company || "").slice(0, 160),
    },
    token: tok(),
    agentId: "", agentLabel: "",
    status: "waiting",
    messages: preset ? [{ from: "visitor", text: String(preset).slice(0, 4000), at: now }] : [],
    createdAt: now, lastAt: now,
  };
  await writeRoom(client, room);
  return room;
}

export async function getRoom(id) {
  const client = await getRedisClient();
  return readRoom(client, id);
}

export async function addMessage(id, from, text) {
  const client = await getRedisClient();
  const room = await readRoom(client, id);
  if (!room || room.status === "ended") return room || null;
  const t = String(text || "").slice(0, 4000).trim();
  if (!t) return room;
  const now = new Date().toISOString();
  room.messages.push({ from: from === "agent" ? "agent" : "visitor", text: t, at: now });
  room.lastAt = now;
  await writeRoom(client, room);
  return room;
}

// Atomic first-wins accept. Returns { room } on success, { taken, room } if
// another agent already owns it, or { error } otherwise.
export async function acceptRoom(id, user) {
  const client = await getRedisClient();
  const room = await readRoom(client, id);
  if (!room) return { error: "not-found" };
  if (room.status === "ended") return { error: "ended" };
  const ok = await client.set(agentKey(id), user.id, { NX: true, EX: ROOM_TTL });
  if (ok !== "OK") return { taken: true, room: await readRoom(client, id) };
  room.agentId = user.id;
  room.agentLabel = user.fullName || user.userId;
  room.status = "active";
  room.lastAt = new Date().toISOString();
  await writeRoom(client, room);
  return { room };
}

export async function endRoom(id) {
  const client = await getRedisClient();
  const room = await readRoom(client, id);
  if (!room) return null;
  room.status = "ended";
  room.lastAt = new Date().toISOString();
  await client.set(roomKey(id), JSON.stringify(room), { EX: END_TTL });
  await client.zRem(INDEX, id);
  return room;
}

// Every live (non-ended) room, newest activity first. Prunes expired ids.
export async function listRooms() {
  const client = await getRedisClient();
  const ids = await client.zRange(INDEX, 0, -1);
  const rooms = [];
  for (const id of ids) {
    const room = await readRoom(client, id);
    if (!room || room.status === "ended") { await client.zRem(INDEX, id); continue; }
    rooms.push(room);
  }
  rooms.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
  return rooms;
}
