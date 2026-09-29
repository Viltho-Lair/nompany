// WHERE A PERSON'S NOTIFICATIONS GO, BEYOND THE BELL — pure, so the /account
// screen, the server that sends and the Node suite read one rule.
//
// THE BELL IS ALWAYS ON. Every notice lands in the studio's bell and its
// notification centre whatever is set here; these settings decide only what
// ALSO goes by email and to this person's phones and computers.
//
// THE PERSON'S, NOT A STUDIO'S (the owner, 28/09/2026: chosen on /account). One
// person in three studios sets it once. What arrives is still gated per studio
// by the rights each notice was sent under — a preference can only narrow.
//
// EMAIL STARTS OFF FOR EVERYBODY (the owner, 29/09/2026). Nobody receives a
// message they did not ask for the day this ships; each person opts in.

import { NOTICE_CATEGORIES, type NoticeCategory } from "./notificationKinds";
import { wallClock, isTimezone } from "./timezone";

export const EMAIL_MODES = ["off", "instant", "digest"] as const;
export type EmailMode = (typeof EMAIL_MODES)[number];

export type ChannelChoice = { email: boolean; push: boolean };

export type NotificationPrefs = {
  /** Off, every notice as it happens, or one summary a day. */
  email: EmailMode;
  /** Per category, whether email and push carry it. The bell always does. */
  channels: Record<NoticeCategory, ChannelChoice>;
  /** No push between these times on the person's own clock. Email is not held. */
  quiet: { on: boolean; from: string; to: string };
  /** The person's clock, for quiet hours and the digest's day. "" is UTC. */
  timezone: string;
  /** The language email and push are written in. */
  locale: "en" | "ar";
  updatedAt?: string;
  /** When the last digest went, so the next one starts where it stopped. */
  lastDigestAt?: string;
};

const allOn = (): Record<NoticeCategory, ChannelChoice> =>
  Object.fromEntries(NOTICE_CATEGORIES.map((c) => [c, { email: true, push: true }])) as Record<NoticeCategory, ChannelChoice>;

export const DEFAULT_PREFS: NotificationPrefs = Object.freeze({
  email: "off",
  channels: allOn(),
  quiet: { on: false, from: "22:00", to: "07:00" },
  timezone: "",
  locale: "en",
}) as NotificationPrefs;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * WHATEVER IS STORED OR SENT, AS A COMPLETE SETTING. Anything unrecognised
 * falls back to the default rather than being refused, so a setting saved
 * before a category existed still reads — the new category arrives ON, the
 * same as it would for somebody who never opened the screen.
 */
export function cleanPrefs(raw: unknown): NotificationPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<NotificationPrefs> & Record<string, unknown>;
  const channels = allOn();
  const given = (r.channels && typeof r.channels === "object" ? r.channels : {}) as Record<string, Partial<ChannelChoice>>;
  for (const c of NOTICE_CATEGORIES) {
    const g = given[c];
    if (g && typeof g === "object") {
      channels[c] = { email: g.email !== false, push: g.push !== false };
    }
  }
  const quiet = (r.quiet && typeof r.quiet === "object" ? r.quiet : {}) as Partial<NotificationPrefs["quiet"]>;
  return {
    email: (EMAIL_MODES as readonly string[]).includes(String(r.email)) ? (r.email as EmailMode) : "off",
    channels,
    quiet: {
      on: quiet.on === true,
      from: HHMM.test(String(quiet.from)) ? String(quiet.from) : DEFAULT_PREFS.quiet.from,
      to: HHMM.test(String(quiet.to)) ? String(quiet.to) : DEFAULT_PREFS.quiet.to,
    },
    timezone: isTimezone(r.timezone) ? String(r.timezone) : "",
    locale: r.locale === "ar" ? "ar" : "en",
    ...(typeof r.updatedAt === "string" ? { updatedAt: r.updatedAt } : {}),
    ...(typeof r.lastDigestAt === "string" ? { lastDigestAt: r.lastDigestAt } : {}),
  };
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * IS IT QUIET HOURS on this person's clock? A window may cross midnight —
 * 22:00 to 07:00 is the usual one — and a window whose ends are equal is
 * empty, not the whole day.
 */
export function inQuietHours(prefs: NotificationPrefs, now: Date = new Date()): boolean {
  if (!prefs.quiet.on) return false;
  const w = wallClock(now, prefs.timezone);
  const at = w.hour * 60 + w.minute;
  const from = minutes(prefs.quiet.from);
  const to = minutes(prefs.quiet.to);
  if (from === to) return false;
  return from < to ? at >= from && at < to : at >= from || at < to;
}

/** Should a notice of this category go out by email the moment it arrives? */
export const wantsInstantEmail = (prefs: NotificationPrefs, category: NoticeCategory) =>
  prefs.email === "instant" && prefs.channels[category]?.email !== false;

/** Should it appear in the daily summary? */
export const wantsInDigest = (prefs: NotificationPrefs, category: NoticeCategory) =>
  prefs.email === "digest" && prefs.channels[category]?.email !== false;

/** Should it be pushed to this person's devices now? Quiet hours hold push. */
export const wantsPush = (prefs: NotificationPrefs, category: NoticeCategory, now: Date = new Date()) =>
  prefs.channels[category]?.push !== false && !inQuietHours(prefs, now);
