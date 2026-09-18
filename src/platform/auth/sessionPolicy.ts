// HOW MANY PLACES ONE PERSON MAY BE SIGNED IN AT ONCE — pure, no store.
//
// THE LOOPHOLE (the owner, 18/09/2026): a company paying for five seats could
// hand one login to twenty people. Every one of them was a live session and
// nothing counted them. So a person holds at most TWO Computer sessions and ONE
// on a Phone or Portable Device (they share the slot, `shared/deviceClass`).
// Twenty people on one login keep signing each other out, which is the point,
// and every sign-out they cause is counted for the console's sharing flag.
//
// A TILL'S SESSION IS NOT COUNTED. A paired till is the company's device, not
// the person's, and a cashier switching in by PIN must not end their own phone.
//
// A SESSION WITH NO RECORDED DEVICE predates this rule and takes a computer
// slot — the only honest guess, and the one that costs a person least: most
// of those are the office machine they signed in on last month.

import { deviceSlot, normalizeDeviceType, type DeviceSlot } from "@/shared/deviceClass";

export const SESSION_LIMITS: Record<DeviceSlot, number> = { computer: 2, mobile: 1 };

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
  studioId?: string;
  terminalId?: string;
};

export const isLive = (row: SessionRow, now: number) => Number(row?.expiresAt) > now;
export const slotOf = (row: SessionRow): DeviceSlot => deviceSlot(row?.deviceType);
export const counts = (row: SessionRow) => row?.scope !== "till";

/**
 * WHAT A NEW SIGN-IN IN `slot` MUST END FIRST.
 *
 * `autoEnd` goes without asking; `choose` is the list the person picks ONE
 * from, oldest first so the default is the obvious one. When the slot is over
 * its limit by more than one — sessions left from before this rule — the
 * oldest of the excess end by themselves, because asking somebody to pick
 * eight sessions one at a time is not a question anybody can answer usefully.
 */
export function planSignIn(rows: readonly SessionRow[], slot: DeviceSlot, now: number) {
  const inSlot = rows
    .filter((r) => isLive(r, now) && counts(r) && slotOf(r) === slot)
    .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  const mustGo = inSlot.length - SESSION_LIMITS[slot] + 1;
  if (mustGo <= 0) return { autoEnd: [] as SessionRow[], choose: [] as SessionRow[] };
  return { autoEnd: inSlot.slice(0, mustGo - 1), choose: inSlot.slice(mustGo - 1) };
}

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
