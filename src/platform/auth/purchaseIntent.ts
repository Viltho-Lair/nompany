import crypto from "node:crypto";
import { derivedSecret } from "@/platform/db/masterKeys";

/* THE PACKAGE A VISITOR CHOSE ON THE PRICING PAGE, CARRIED UNTIL THEY HAVE A STUDIO.
   ---------------------------------------------------------------------------
   The owner, 24/09/2026: a package picked on the pricing page is QUEUED for
   the person until they have finished registering, and applies to the first
   studio they create. Before this, the pricing links added `?package=` and
   nothing on signup, login, the one-time code or Google/Microsoft sign-in read
   it — the choice died on the signup page, every time.

   A COOKIE, NOT A QUERY STRING, because a query string does not survive the
   trip: the one-time code step replaces the page, and an OAuth round trip
   leaves the site entirely and comes back to a fixed address. The cookie is
   set BEFORE any account exists, which is the other reason it cannot live on
   the account.

   SIGNED, because what it names decides what somebody is offered to pay for,
   and a cookie is something the visitor can type. It carries ids only —
   nothing about the person — and the ids are checked against the catalogue
   again wherever the intent is USED, so a signature proves where the cookie
   came from, never that the package still exists.

   A CHOICE, NOT A PURCHASE. Nothing is charged, reserved or granted by it: it
   pre-selects the Plan step of studio creation, where the owner can change it,
   and a paid package applies to a studio only once that studio has paid. */

export const INTENT_COOKIE = "nc_intent";
/** Seven days: long enough for somebody to register over a weekend. */
export const INTENT_TTL_SEC = 7 * 24 * 60 * 60;

export type BillingCycle = "monthly" | "yearly";
export type PurchaseIntent = {
  /** A catalogue package id. */
  packageId: string;
  /** A band (category) of a compound package, or "" for a single-price one. */
  categoryId: string;
  cycle: BillingCycle;
};

// THE SHAPES THE CATALOGUE MINTS, and nothing wider. A value that does not look
// like an id never reaches a lookup, a log line or a cookie.
const PACKAGE_ID = /^pkg_[a-z0-9]{4,40}$/;
// `c1`, `c2` … is what the catalogue mints when a band was saved with no id.
const CATEGORY_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** What a link asked for, or null when it names no well-formed package. */
export function parseIntent(input: { package?: unknown; band?: unknown; cycle?: unknown }): PurchaseIntent | null {
  const packageId = String(input.package ?? "").trim();
  if (!PACKAGE_ID.test(packageId)) return null;
  const band = String(input.band ?? "").trim();
  return {
    packageId,
    categoryId: CATEGORY_ID.test(band) ? band : "",
    cycle: input.cycle === "yearly" ? "yearly" : "monthly",
  };
}

function secret(): Buffer | string {
  // A subkey of the one key, the way every other sign-in secret is taken
  // (invariant 18: a purpose label, never a second key variable). The literal
  // fallback exists only where no key is configured at all — a local run —
  // and matches the posture of the OAuth state beside it.
  return derivedSecret("purchase-intent") || process.env.OTP_SECRET || "nompany-purchase-intent";
}

const sign = (body: string) => crypto.createHmac("sha256", secret()).update(body).digest("base64url");

// Constant-time, and length first because timingSafeEqual throws on a mismatch.
function same(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** The cookie value: `<payload>.<signature>`, the issue time inside the payload. */
export function sealIntent(intent: PurchaseIntent, nowMs: number = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...intent, at: nowMs }), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/** The intent a cookie carries, or null when it is absent, forged, malformed or older than the TTL. */
export function openIntent(value: unknown, nowMs: number = Date.now()): PurchaseIntent | null {
  const [body, sig, extra] = String(value ?? "").split(".");
  if (!body || !sig || extra !== undefined) return null;
  if (!same(sig, sign(body))) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const at = Number(raw?.at);
  if (!Number.isFinite(at) || at > nowMs || nowMs - at > INTENT_TTL_SEC * 1000) return null;
  // Re-parsed, so a payload signed under an older, looser shape cannot slip a
  // field past the rules a fresh link is held to.
  return parseIntent({ package: raw.packageId, band: raw.categoryId, cycle: raw.cycle });
}

/** The intent in a request's cookies, if any. */
export function intentFromRequest(request: Request, nowMs: number = Date.now()): PurchaseIntent | null {
  const header = request.headers.get("cookie") || "";
  const hit = header.split(/;\s*/).find((c) => c.startsWith(`${INTENT_COOKIE}=`));
  return hit ? openIntent(decodeURIComponent(hit.slice(INTENT_COOKIE.length + 1)), nowMs) : null;
}

type CatalogueRow = Record<string, unknown>;

/**
 * The intent if the catalogue still SELLS it, with the band settled; null
 * otherwise. The one check, used where a choice is remembered and again where
 * it is used, because a package can be unpublished in between. Public, not
 * free (the free package is the absence of a choice) and not premium (Large is
 * sold by a conversation, not queued). A band that is not this package's own
 * is replaced by its first rather than believed — the Plan step shows it and
 * the owner can move it.
 */
export function intentOnSale(intent: PurchaseIntent | null, packages: CatalogueRow[]): PurchaseIntent | null {
  if (!intent) return null;
  const pkg = packages.find((p) => p.id === intent.packageId);
  if (!pkg || !pkg.isPublic) return null;
  const type = String(pkg.type || "compound");
  if (type === "free" || type === "premium") return null;
  const bands = (Array.isArray(pkg.categories) ? pkg.categories : []) as CatalogueRow[];
  if (!bands.length) return { ...intent, categoryId: "" };
  const band = bands.find((b) => b.id === intent.categoryId) || bands[0];
  return { ...intent, categoryId: String(band.id || "") };
}

/**
 * What to call the package somebody is heading for, from the catalogue as it
 * is now: "Small · Std. Plus" for a paid choice, the free package's own name
 * when there is none. "" when the catalogue no longer has either — the screen
 * then shows nothing rather than a name for a package that is gone.
 */
export function intentLabel(intent: PurchaseIntent | null, packages: CatalogueRow[], locale: string): string {
  const named = (row: CatalogueRow | undefined) =>
    row ? String((locale === "ar" && row.nameAr) || row.name || "") : "";
  if (!intent) return named(packages.find((p) => p.type === "free" && p.isPublic));
  const pkg = packages.find((p) => p.id === intent.packageId);
  if (!pkg) return "";
  const bands = (Array.isArray(pkg.categories) ? pkg.categories : []) as CatalogueRow[];
  const band = bands.find((b) => b.id === intent.categoryId);
  return band?.label ? `${named(pkg)} · ${String(band.label)}` : named(pkg);
}

export function intentCookie(value: string, isHttps: boolean) {
  return `${INTENT_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${INTENT_TTL_SEC}${isHttps ? "; Secure" : ""}`;
}

export function clearedIntentCookie() {
  return `${INTENT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
