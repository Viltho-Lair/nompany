// Client-safe chat constants and projections — shared by the studio widget, the
// /super console and the API routes. No server imports, so either side can pull
// from it.

export const WAITING = "waiting";
export const ACTIVE = "active";
export const ENDED = "ended";
// The room's key is gone (its TTL elapsed, or it was ended long enough ago).
// A client state only, never stored: it is what a 404 from the poll means.
export const GONE = "gone";

export const STUDIO = "studio";
export const NOMPANY = "nompany";

// What the studio side is told it is talking to. The console shows the actual
// admin's address, but the studio is talking to NOMPANY, not to a named person —
// naming the individual would turn "who handled this" into an expectation that
// the same person is there next time.
export const SUPPORT_LABEL = "nompany Support";

export const MAX_MESSAGE_CHARS = 4000;

// Polling intervals. The room is the fast one because it carries the typing
// half of the conversation; the console's queue can afford to be slower, and
// both stop entirely while the tab is hidden (see the components).
export const ROOM_POLL_MS = 2000;
export const QUEUE_POLL_MS = 4000;

// WHO THE CONSOLE SEES ASKING. The studio-local alias first — inside a studio
// that is who this person is — then their account name, then the local part of
// their address so a row is never nameless.
//
// Shared rather than inlined because it is computed TWICE: once by the widget,
// to show someone how they are about to be introduced, and once by the API,
// which is the copy that counts (the request never gets to name itself).
export function chatDisplayName(
  { alias, profile, email }: { alias?: string; profile?: { fullName?: string; shortName?: string }; email?: string } = {},
) {
  return (
    (alias || "").trim()
    || (profile?.shortName || "").trim()
    || (profile?.fullName || "").trim()
    || String(email || "").split("@")[0]
    || "Studio member"
  );
}

// What the STUDIO side may see. It gets no admin identity and no room-holder
// id — only whether somebody from nompany has joined.
export function forStudio(room) {
  return {
    id: room.id,
    studioName: room.studioName,
    userName: room.userName,
    status: room.status,
    agent: room.adminId ? { label: SUPPORT_LABEL } : null,
    messages: room.messages || [],
    createdAt: room.createdAt,
    lastAt: room.lastAt,
  };
}

// What the CONSOLE may see: the same thread plus who it is from and who holds
// it, which is the whole point of the queue.
export function forNompany(room) {
  return {
    id: room.id,
    studioId: room.studioId,
    studioName: room.studioName,
    studioSlug: room.studioSlug,
    userName: room.userName,
    status: room.status,
    adminId: room.adminId || "",
    adminLabel: room.adminLabel || "",
    messages: room.messages || [],
    createdAt: room.createdAt,
    lastAt: room.lastAt,
  };
}

// A queue row — everything the list needs and not one message more, so polling
// the queue never re-sends every open conversation.
export function summarize(room) {
  const messages = room.messages || [];
  const last = messages[messages.length - 1];
  return {
    id: room.id,
    studioName: room.studioName,
    studioSlug: room.studioSlug,
    userName: room.userName,
    status: room.status,
    adminId: room.adminId || "",
    adminLabel: room.adminLabel || "",
    msgCount: messages.length,
    lastText: last?.text || "",
    lastFrom: last?.from || "",
    createdAt: room.createdAt,
    lastAt: room.lastAt,
  };
}

// HH:MM in the viewer's locale, for a message bubble.
export function fmtTime(value) {
  const t = Date.parse(value || "");
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
