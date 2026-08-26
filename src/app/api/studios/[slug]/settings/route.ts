import { requirePermission } from "@/platform/access";
import { renameStudio } from "@/modules/main/studios";
import { isKnownCurrency, crossRate } from "@/shared/currencies";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { updateStudio } from "@/modules/main/studios";
import { studioLocale, isLocale, defaultLocale } from "@/shared/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Studio-level settings — the studio's own identity, not a section's data and
// not the person's account. Reading is open to any member so the shell can show
// the logo; writing is admin-only, and the API is the enforcement, never the
// hidden button.
//
// These live on the studio row in the g:studios registry, so they are covered by
// the studio's existing deletion path: removing a studio removes the row and the
// settings with it. No new key, no new collection, nothing extra to cascade.

// Explicit allowlist. updateStudio() takes any patch except id/ownerUserId/slug,
// so the boundary that decides what a request may write has to be here.
const FIELDS = [
  "logo", "country", "city", "location", "currency",
  // THE TENANT'S LANGUAGE — see studioLocale in shared/i18n. It sets the
  // direction and the dictionary for everyone inside this studio, which is why
  // it sits behind studio.settings.edit like every other shared decision here
  // rather than being a per-person preference.
  "language",
  "workingHours", "legalInfo", "favoriteCurrencies",
  // fieldOfWork, fieldOfWorkOther, serviceActions and retiredServiceActions are
  // deliberately NOT here. Writing a service action is not "set this text" — it
  // is "recompute the pool": choosing a field re-seeds it from the matrix, and
  // removing an in-use action retires rather than deletes it (see
  // studioServiceActions.ts). A blind write through this allowlist would bypass
  // that guarantee, so settings/service-actions/route.ts is the SOLE writer of
  // all four; this route only displays them (see clean()).
];

// Mon-first, which is how a working week is read here.
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// A studio is not deleted the moment it is asked for. Thirty days of grace,
// during which the owner can change their mind and everything keeps working.
export const GRACE_DAYS = 30;
export const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

// Working hours are a fixed SHAPE, not free JSON: seven known days, each open or
// closed with a from/to. Anything else in the payload is dropped, so a bad
// request cannot put an eighth day or a malformed time into the record.
type DayHours = { open?: unknown; from?: string; to?: string };

function cleanHours(v: unknown) {
  const src = (v && typeof v === "object" ? v : {}) as Record<string, DayHours | undefined>;
  const out: Record<string, { open: boolean; from: string; to: string }> = {};
  for (const d of DAYS) {
    const row: DayHours = src[d] && typeof src[d] === "object" ? src[d]! : {};
    const from = TIME.test(String(row.from)) ? String(row.from) : "09:00";
    const to = TIME.test(String(row.to)) ? String(row.to) : "17:00";
    out[d] = { open: Boolean(row.open), from, to };
  }
  return out;
}

// Legal information is a LIST OF PAIRS the studio names itself — CR number, VAT
// number, whatever its jurisdiction expects — rather than a fixed set of fields.
// Fixing the fields here would mean guessing which country a studio is in and
// being wrong for every other one.
//
// A row with no key is dropped: a value nobody labelled cannot be read later.
// The handful of currencies this studio actually deals in, picked out of the
// full ExchangeRate-API list. Codes only — the names come from the vocabulary in
// lib/currencies, so a studio's saved list never goes stale when a name changes.
// Unknown codes are dropped, duplicates collapse, order is the caller's.
function cleanFavourites(v: unknown) {
  const seen = new Set();
  for (const raw of Array.isArray(v) ? v : []) {
    const code = String(raw ?? "").trim().toUpperCase();
    if (isKnownCurrency(code)) seen.add(code);
    if (seen.size >= 25) break;
  }
  return [...seen];
}

function cleanLegal(v: unknown) {
  return (Array.isArray(v) ? v : []).slice(0, 40).map((row) => ({
    key: String(row?.key ?? "").trim().slice(0, 80),
    value: String(row?.value ?? "").trim().slice(0, 300),
  })).filter((row) => row.key);
}

const clean = (studio: Record<string, unknown>) => ({
  id: studio.id, name: studio.name, slug: studio.slug, logo: studio.logo || "",
  country: studio.country || "", city: studio.city || "", location: studio.location || "",
  currency: studio.currency || "",
  language: studioLocale(studio),
  deletionRequestedAt: studio.deletionRequestedAt || "",
  deletionFinalisesAt: studio.deletionRequestedAt
    ? new Date(Date.parse(String(studio.deletionRequestedAt)) + GRACE_MS).toISOString()
    : "",
  workingHours: studio.workingHours || null,
  legalInfo: Array.isArray(studio.legalInfo) ? studio.legalInfo : [],
  favoriteCurrencies: Array.isArray(studio.favoriteCurrencies) ? studio.favoriteCurrencies : [],
  serviceActions: Array.isArray(studio.serviceActions) ? studio.serviceActions : [],
  // Display only — see the WHY note on FIELDS. Written solely by
  // settings/service-actions/route.ts.
  fieldOfWork: String(studio.fieldOfWork || ""),
  fieldOfWorkOther: String(studio.fieldOfWorkOther || ""),
  retiredServiceActions: Array.isArray(studio.retiredServiceActions) ? studio.retiredServiceActions : [],
});

// Rates from the studio's own currency out to each favourite. Anything the
// snapshot does not quote comes back null rather than absent, so the row can say
// so instead of rendering a blank.
async function favouriteRates(studio: Record<string, unknown>) {
  const base = String(studio.currency || "").trim().toUpperCase();
  const codes = Array.isArray(studio.favoriteCurrencies) ? studio.favoriteCurrencies : [];
  if (!base || codes.length === 0) return { base, rates: {}, updatedAt: 0, stale: false };

  const snap = await getExchangeSnapshot();
  const rates: Record<string, number | null> = {};
  for (const code of codes) rates[String(code)] = snap.rates ? crossRate(snap.rates, base, String(code)) : null;
  return { base, rates, updatedAt: snap.updatedAt || 0, stale: Boolean(snap.stale) };
}

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;
  return Response.json({
    studio: clean(studio),
    // Today's rate for each favourite, against the STUDIO's currency. Only the
    // handful of numbers the page shows go over the wire — /super ships the
    // whole USD table because it lets you re-pick the base, and this page does
    // not. The snapshot is a shared daily read, so this costs no API call.
    fx: await favouriteRates(studio),
    canManage: !requirePermission(context.access, "studio.settings.edit"),
    // Asking for deletion is the OWNER's call, not an admin's: it ends the
    // studio for everybody in it.
    isOwner: collaborator.role === "owner",
  });
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;
  // The studio's own settings are a grantable right rather than an admin-only
  // one. Requesting DELETION stays owner-only below — that ends the studio for
  // everybody, which is not something a permission should be able to hand out.
  if (requirePermission(context.access, "studio.settings.edit")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  // Requesting or cancelling deletion is handled apart from the ordinary
  // settings and is the OWNER's alone — an admin can change the logo, not end
  // the studio. Cancelling is deliberately as easy as asking: the grace period
  // is only worth having if changing your mind is one click.
  if ("requestDeletion" in body) {
    if (collaborator.role !== "owner") return Response.json({ error: "owner-only" }, { status: 403 });
    const updated = await updateStudio(studio.id, {
      deletionRequestedAt: body.requestDeletion ? new Date().toISOString() : "",
    });
    return updated
      ? Response.json({ ok: true, studio: clean(updated) })
      : Response.json({ error: "notfound" }, { status: 404 });
  }

  // RENAMING is the owner's call and takes effect immediately — the address
  // included, so the studio answers to its new one from the next request and
  // stops answering to the old one. See renameStudio.
  if (body?.rename) {
    if (collaborator.role !== "owner") return Response.json({ error: "owner-only" }, { status: 403 });
    const out = await renameStudio(studio.id, body.rename);
    if (out.error) {
      const status = out.error === "notfound" ? 404 : out.error === "slug-taken" ? 409 : 400;
      return Response.json({ error: out.error }, { status });
    }
    // The new address goes back with it: the screen that asked for the rename is
    // sitting on the old URL and has to move itself.
    return Response.json({ ok: true, changed: out.changed, studio: clean(out.studio || {}) });
  }

  const patch: Record<string, unknown> = {};
  for (const key of FIELDS) {
    if (!(key in body)) continue;
    // Working hours is the one structured field; everything else is text, and
    // "" is a real value — it is how the logo is removed.
    patch[key] = key === "workingHours" ? cleanHours(body[key])
      // Refused rather than coerced: an unrecognised language would set the
      // whole tenant to a dictionary that does not exist. `isLocale` is the
      // same guard the public site uses on its own URL segment.
      : key === "language" ? (isLocale(body[key]) ? body[key] : defaultLocale)
      : key === "legalInfo" ? cleanLegal(body[key])
      : key === "favoriteCurrencies" ? cleanFavourites(body[key])
      : String(body[key] ?? "").slice(0, 500);
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  return Response.json({ ok: true, studio: clean(updated) });
}
