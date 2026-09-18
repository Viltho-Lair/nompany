// A TILL IS A DEVICE (the owner, 18/09/2026). `docs/functionality/pos.md` and
// `docs/functionality/sessions-and-devices.md` are the files.
//
// WHAT IT REPLACED. A till was a name, and which one a computer used was a
// preference in that browser's storage. Any browser could pick any till, two
// computers could sell on one till at once, clearing the browser lost it, and
// anybody holding the right could open the till from a laptop at home.
//
// NOW: a manager PAIRS a device to a till once, from that device, in Point of
// Sale → Settings. The server hands the device a secret in an HttpOnly cookie
// and keeps only its digest on the till. The till screen opens ONLY on a paired
// device — no exception for managers — and on it goes straight to its own till.
// One device per till: pairing another unpairs the first, and a manager can
// unpair a lost device from anywhere.
//
// ON A PAIRED TILL, CASHIERS CHANGE BY PIN. The device keeps the company's
// session rather than a person's: a cashier picks their name and types their
// PIN, and gets a session good for this till and nothing else, counted against
// nobody's device limit.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { repo } from "@/platform/db/repo";
import { getStudioById } from "@/modules/main/studios";
import { getSectionByKey } from "@/platform/db/sections";
import { listCollaborators } from "@/platform/auth/collaborators";
import { getProfilesByIds } from "@/platform/auth/users";
import { collaboratorsHolding } from "@/modules/people/holders";
import { hashToken } from "@/platform/auth/passwords";

export const TILL_COOKIE = "nc_till";
const TILL_COOKIE_TTL = 400 * 24 * 60 * 60;   // about a year, the most a browser keeps one

export type TillPairing = { tokenHash: string; pairedAt: string; pairedByCollaboratorId: string; label: string };
type Terminal = { id: string; name: string; code?: string; active: boolean; pairing?: TillPairing | null };

const Terminals = repo<Terminal>("posTerminals");

export function tillCookie(value: string, isHttps: boolean) {
  const secure = isHttps ? "; Secure" : "";
  return `${TILL_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TILL_COOKIE_TTL}${secure}`;
}
export function clearedTillCookie() {
  return `${TILL_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** A fresh pairing: the secret the device keeps and the digest the till keeps. */
export function newPairing(studioId: string, terminalId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  return { cookieValue: `${studioId}.${terminalId}.${token}`, tokenHash: hashToken(token) };
}

/** What the device's cookie claims, before anything is believed. */
export async function tillClaim(): Promise<{ studioId: string; terminalId: string; token: string } | null> {
  const raw = (await cookies()).get(TILL_COOKIE)?.value || "";
  const [studioId, terminalId, token] = raw.split(".");
  return studioId && terminalId && token ? { studioId, terminalId, token } : null;
}

/** Does this pairing's secret match the till's? Constant-time. */
export function pairingMatches(pairing: TillPairing | null | undefined, token: string): boolean {
  if (!pairing?.tokenHash || !token) return false;
  const a = Buffer.from(pairing.tokenHash);
  const b = Buffer.from(hashToken(token));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * THE TILL THIS DEVICE IS PAIRED TO, in this studio — or null. Read from the
 * till's own section, so a cookie naming another studio, a retired till, or a
 * pairing somebody has since replaced answers null.
 */
export async function pairedTerminalIn(
  studio: { id: string }, posSection: { id: string },
): Promise<Terminal | null> {
  const claim = await tillClaim();
  if (!claim || claim.studioId !== studio.id) return null;
  const terminal = await Terminals.byId({ studio, section: posSection }, claim.terminalId);
  if (!terminal || terminal.active === false || !pairingMatches(terminal.pairing, claim.token)) return null;
  return terminal;
}

/**
 * THE SAME QUESTION WITH NO SESSION TO ASK IT FROM — the sign-in page on a
 * paired till, and the cashier switch. The cookie is the whole proof, so it is
 * checked in full before anything about the studio is returned.
 */
export async function pairedTill() {
  const claim = await tillClaim();
  if (!claim) return null;
  const [studio, posSection] = await Promise.all([
    getStudioById(claim.studioId),
    getSectionByKey(claim.studioId, "crm-sales-pos"),
  ]);
  if (!studio || !posSection) return null;
  const terminal = await pairedTerminalIn({ id: String(studio.id) }, { id: String(posSection.id) });
  return terminal ? { studio, terminal } : null;
}

/**
 * WHO MAY TAKE OVER THIS TILL: everybody in the studio who may sell at it.
 * Names only — this is shown on a device standing at a counter.
 */
export async function tillCashiers(studioId: string) {
  const people = await collaboratorsHolding(studioId, "crmSales.pos.create");
  const profiles = await getProfilesByIds(people.map((p) => String(p.userId || "")));
  return people
    .map((p, i) => ({ id: String(p.id), name: String(p.alias || profiles[i]?.fullName || "").trim() }))
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The collaborator a cashier picked, if they are still one who may sell. */
export async function tillCashier(studioId: string, collaboratorId: string) {
  const [holders, all] = await Promise.all([
    collaboratorsHolding(studioId, "crmSales.pos.create"),
    listCollaborators(studioId),
  ]);
  if (!holders.some((c) => String(c.id) === collaboratorId)) return null;
  return all.find((c) => String(c.id) === collaboratorId) || null;
}
