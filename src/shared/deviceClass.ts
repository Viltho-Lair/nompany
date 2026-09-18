// WHAT KIND OF DEVICE SIGNED IN — Computer, Phone or Portable Device.
//
// The owner's three types (18/09/2026). A person may hold two Computer sessions
// and one more on a Phone OR a Portable Device, which share a slot, so the type
// decides WHICH slot a sign-in takes (`deviceSlot`).
//
// IT WAS DECIDED FROM THE USER AGENT ALONE, and wrong both ways:
// `/Mobi|Android|iPhone/` put every Android tablet under Phone, because a
// tablet's user agent says "Android" too; and since iPadOS 13 Safari on an iPad
// describes itself as a Mac, so iPads were Computers. "Tablet" was reached by
// almost nothing.
//
// So the browser reports two facts at sign-in (`DeviceHints`, written by the
// sign-in pages into a short-lived cookie): how many touch points the screen
// has and its short side in CSS pixels. A "Mac" with touch is an iPad; a touch
// screen under 600px on its short side is a phone whatever it claims to be.
//
// ALL OF IT IS SELF-REPORTED and a browser can claim to be anything. That is
// why the session limit holds on the TOTAL; the type only decides which slot is
// taken and what the device list says.

export const DEVICE_TYPES = ["Computer", "Phone", "Portable Device"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];
export type DeviceSlot = "computer" | "mobile";
export type DeviceHints = { touchPoints?: number; shortSide?: number };

/** A phone's short side is under this; a tablet's is over it (CSS pixels). */
const PHONE_SHORT_SIDE = 600;

/** The cookie the sign-in pages write the hints into, read by the server. */
export const DEVICE_HINTS_COOKIE = "nc_dh";

/** `t5.s390` — touch points and short side, the cookie's whole value. */
export function encodeHints(h: DeviceHints): string {
  const t = Math.max(0, Math.min(20, Math.round(Number(h.touchPoints) || 0)));
  const s = Math.max(0, Math.min(10000, Math.round(Number(h.shortSide) || 0)));
  return `t${t}.s${s}`;
}

export function decodeHints(raw: unknown): DeviceHints {
  const m = /^t(\d{1,2})\.s(\d{1,5})$/.exec(String(raw || ""));
  return m ? { touchPoints: Number(m[1]), shortSide: Number(m[2]) } : {};
}

export function classifyDevice(userAgent: unknown, hints: DeviceHints = {}): DeviceType {
  const ua = String(userAgent || "");
  const touch = Number(hints.touchPoints) > 1;
  const short = Number(hints.shortSide) || 0;

  // What the user agent says plainly comes first.
  if (/iPhone|iPod/.test(ua)) return "Phone";
  if (/iPad|Tablet|Kindle|Silk\//i.test(ua)) return "Portable Device";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Phone" : "Portable Device";
  if (/Mobi/.test(ua)) return "Phone";

  // AN iPAD ASKING FOR THE DESKTOP SITE, which is what Safari on an iPad does
  // by default: a Mac with a touch screen. No Mac has one.
  if (/Macintosh/.test(ua) && touch) return "Portable Device";

  // A PHONE ASKING FOR THE DESKTOP SITE sends a desktop user agent; its screen
  // still gives it away. A touch laptop has a far larger short side, so this
  // never moves one of those.
  if (touch && short > 0 && short < PHONE_SHORT_SIDE) return "Phone";

  return "Computer";
}

/** Rows written before 18/09/2026 say "Tablet"; that type is Portable Device now. */
export function normalizeDeviceType(value: unknown): DeviceType | "" {
  const v = String(value || "");
  if (v === "Tablet") return "Portable Device";
  return (DEVICE_TYPES as readonly string[]).includes(v) ? (v as DeviceType) : "";
}

/** Phones and portable devices share one slot (the owner, 18/09/2026). */
export function deviceSlot(type: unknown): DeviceSlot {
  const t = normalizeDeviceType(type);
  return t === "Phone" || t === "Portable Device" ? "mobile" : "computer";
}
