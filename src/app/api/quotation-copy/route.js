import { getSettings, updateSettings } from "@/lib/db";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { canSeeAllIn, TECHNICAL_TAG } from "@/lib/authConstants";
import { DEFAULT_QUOTATION_COPY } from "@/lib/quotationSheet";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = ["Residential", "Commercial"];

// The per-building-type Introduction / Summary copy printed on the quotation
// cover. Editable by a Technical Leader (or admin) in Technical → Settings.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const s = await getSettings();
  const stored = s?.quotationCopy || {};
  const out = {};
  for (const t of TYPES) {
    out[t] = {
      intro: stored[t]?.intro ?? "",
      summary: stored[t]?.summary ?? "",
      placeholder: DEFAULT_QUOTATION_COPY[t],
    };
  }
  return Response.json(out);
}

export async function PUT(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  // Leaders (Technical + Leader) or admin only.
  if (!canSeeAllIn(actor, TECHNICAL_TAG)) return forbidden();
  const body = await request.json();
  const clean = {};
  for (const t of TYPES) {
    const c = body?.[t] || {};
    clean[t] = { intro: String(c.intro || "").slice(0, 4000), summary: String(c.summary || "").slice(0, 4000) };
  }
  await updateSettings({ quotationCopy: clean });
  logActivity({ actor, verb: "updated", sectionKey: "technical-settings", entityType: "settings", entityId: "quotationCopy", label: "Quotation cover copy updated", href: "/studio/technical/settings" }).catch(() => {});
  return Response.json(clean);
}
