// ONE PERSON'S SESSIONS — the row shape and the pure rules read over it.
//
// THERE IS NO LIMIT ON HOW MANY PLACES A PERSON MAY BE SIGNED IN (the owner,
// 19/09/2026: "remove limitations for users"). A limit of two computers and one
// phone shipped on 18/09/2026, with a sign-in step asking which session to end
// and a cap of three trusted devices beside it; all of it was taken out the
// next day. `git log -p -- src/platform/auth/sessionPolicy.ts` has it.
//
// What stays against a shared login is what does not stop anybody working: the
// console SEES where each person is signed in and how many new devices their
// account has met (`sharingSignals` below), the PIN is asked at a signature,
// and a till opens only on its paired device.
//
// A TILL'S SESSION IS NOT COUNTED as the person's. A paired till is the
// company's device, so the console's session count leaves it out.

import { normalizeDeviceType } from "@/shared/deviceClass";

export type SessionRow = {
  id?: string;
  tokenHash?: string;
  /** Rows minted before H-1 hold the plaintext token; see users.ts. */
  token?: string;
  createdAt: number;
  expiresAt: number;
  deviceId?: string;
  deviceType?: string;
  label?: string;
  location?: string;
  /** "till" — opened by a cashier's PIN on a paired till. */
  scope?: string;
  /** "desktop" — the desktop app, which has no heartbeat and its own OS lock. */
  client?: string;
  studioId?: string;
  terminalId?: string;
};

export const isLive = (row: SessionRow, now: number) => Number(row?.expiresAt) > now;
export const counts = (row: SessionRow) => row?.scope !== "till";

/** The id a screen holds. Rows from before ids existed are named by their digest. */
export function sessionIdOf(row: SessionRow, digest: (token: string) => string): string {
  if (row?.id) return row.id;
  const hash = row?.tokenHash || (row?.token ? digest(row.token) : "");
  return hash ? `h${hash.slice(0, 16)}` : "";
}

/** What a person is shown about a session: never its token or digest. */
export function publicSession(row: SessionRow, digest: (token: string) => string) {
  return {
    id: sessionIdOf(row, digest),
    label: String(row.label || ""),
    deviceType: normalizeDeviceType(row.deviceType) || "",
    location: String(row.location || ""),
    createdAt: Number(row.createdAt) || 0,
    till: row.scope === "till",
  };
}
export type PublicSession = ReturnType<typeof publicSession>;

// ---- the sharing flag -----------------------------------------------------------
//
// WHAT MAKES AN ACCOUNT LOOK SHARED, for the console (the owner, 18/09/2026:
// raise a flag, filter on it, and email the person — suspending stays a
// person's decision). A FLAG IS A REASON TO LOOK, never a verdict.
//
// ONE SIGNAL NOW: devices this account had never used, five or more in a
// month — five new machines is not one person's month. The second signal,
// sessions ended by another sign-in, went with the session limit that produced
// it (19/09/2026). How many places a person is signed in right now is shown
// beside the flag and filterable, not a trigger: with no limit, a number is a
// fact about somebody's desk, and the console reads it with the rest.
export const SHARING_THRESHOLDS = { newDevices30d: 5 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function sharingSignals(
  activity: { newDevices?: unknown } | null | undefined,
  activeSessions: number,
  now: number,
) {
  const within = (list: unknown, days: number) =>
    (Array.isArray(list) ? list : []).filter((t) => Number.isFinite(Number(t)) && now - Number(t) < days * DAY_MS).length;
  const newDevices30d = within(activity?.newDevices, 30);
  const reasons: "new-devices"[] = [];
  if (newDevices30d >= SHARING_THRESHOLDS.newDevices30d) reasons.push("new-devices");
  return { newDevices30d, activeSessions, flagged: reasons.length > 0, reasons };
}

// ---- the lock ---------------------------------------------------------------------
//
// A SESSION IS LOCKED when somebody pressed the lock, or when the person's idle
// timeout has run out since the last sign of them. The browser reports activity
// at most once a minute (a heartbeat), so the grace covers one missed beat —
// without it a session would lock itself between two beats of somebody typing.
//
// ENFORCED ON THE SERVER. A lock that only drew over the page would leave every
// other tab, the developer tools and a direct API call working as before.
export const IDLE_GRACE_MS = 90 * 1000;

export function isLocked(
  state: { lockedAt?: number; idleMs?: number; lastActiveAt?: number } | null | undefined,
  now: number,
): boolean {
  if (!state) return false;
  if (Number(state.lockedAt) > 0) return true;
  const idle = Number(state.idleMs) || 0;
  const last = Number(state.lastActiveAt) || 0;
  return idle > 0 && last > 0 && now - last > idle + IDLE_GRACE_MS;
}
