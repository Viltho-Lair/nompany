import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { updateStudio } from "@/lib/data/studios";

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
const FIELDS = ["logo", "country", "city", "location", "workingHours"];

// Mon-first, which is how a working week is read here.
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Working hours are a fixed SHAPE, not free JSON: seven known days, each open or
// closed with a from/to. Anything else in the payload is dropped, so a bad
// request cannot put an eighth day or a malformed time into the record.
function cleanHours(v) {
  const src = v && typeof v === "object" ? v : {};
  const out = {};
  for (const d of DAYS) {
    const row = src[d] && typeof src[d] === "object" ? src[d] : {};
    const from = TIME.test(row.from) ? row.from : "09:00";
    const to = TIME.test(row.to) ? row.to : "17:00";
    out[d] = { open: Boolean(row.open), from, to };
  }
  return out;
}

const clean = (studio) => ({
  id: studio.id, name: studio.name, slug: studio.slug, logo: studio.logo || "",
  country: studio.country || "", city: studio.city || "", location: studio.location || "",
  workingHours: studio.workingHours || null,
});

export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;
  return Response.json({ studio: clean(studio), canManage: canAdminister(studio, collaborator) });
}

export async function PUT(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const context = await studioContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
  }
  const { studio, collaborator } = context;
  if (!canAdminister(studio, collaborator)) return Response.json({ error: "forbidden" }, { status: 403 });

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const patch = {};
  for (const key of FIELDS) {
    if (!(key in body)) continue;
    // Working hours is the one structured field; everything else is text, and
    // "" is a real value — it is how the logo is removed.
    patch[key] = key === "workingHours" ? cleanHours(body[key]) : String(body[key] ?? "").slice(0, 500);
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateStudio(studio.id, patch);
  if (!updated) return Response.json({ error: "notfound" }, { status: 404 });
  return Response.json({ ok: true, studio: clean(updated) });
}
