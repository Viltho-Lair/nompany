import { route } from "@/platform/http/route";
import { listPlatformIndustries, writePlatformIndustry, dropPlatformIndustry } from "@/platform/db/flows";
import { FLOW_TEMPLATES } from "@/platform/engagement/templates";
import { FIELDS_OF_WORK } from "@/shared/fieldsOfWork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE TRADES THE PRODUCT KNOWS, and which deal flow each one starts on.
//
// THE OWNER, 20/09/2026: "one of which is the drop list of industries so I can
// add more in the future". They were a hardcoded list of twenty-five
// (`platform/engagement/industries`), so adding a trade — or correcting which
// flow one starts on — was a release. The console owns the list now; the code's
// twenty-five remain as the seed underneath, so nothing has to be re-entered
// and a row taken away here falls back to the built-in rather than vanishing.
//
// A STUDIO'S OWN ROW STILL WINS. `listIndustries` reads code, then this, then
// the studio's own — a studio that genuinely works a trade differently keeps
// saying so, and this list is what every other studio starts from.
const spec = { auth: "super", name: "super/erp-industries" };

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const keyFrom = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const GET = route(spec, async () => ({
  industries: await listPlatformIndustries(),
  // WHAT A ROW MAY POINT AT, sent with the list rather than restated in the
  // screen: the built-in flows (this list seeds every studio, so it may only
  // name a flow every studio has) and the trades a studio can pick from, which
  // is what joins an industry to the studios that will read it.
  templates: FLOW_TEMPLATES.map((t) => ({ id: t.id, name: t.name })),
  fields: FIELDS_OF_WORK,
}));

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  const name = str(body?.name, 80);
  if (!name) return { error: "name" };
  // THE KEY IS WHAT A DEAL STORES, so it is derived once from the name and is
  // never re-derived on an edit: renaming a trade for readability must not
  // orphan every deal that named it.
  const key = str(body?.key, 60) || keyFrom(name);
  if (!key) return { error: "key" };

  const result = await writePlatformIndustry({
    key,
    name,
    primary: str(body?.primary, 20),
    secondary: str(body?.secondary, 20),
    note: str(body?.note, 200),
    // The same trade's name in `shared/fieldsOfWork`, character for character —
    // the join that lets a studio's own field of work resolve to its flow.
    field: str(body?.field, 80),
  });
  if ("error" in result) return result;
  return { ok: true, industries: await listPlatformIndustries() };
});

export const DELETE = route({ ...spec, body: true }, async ({ body }) => {
  const key = str(body?.key, 60);
  if (!key) return { error: "missing" };
  await dropPlatformIndustry(key);
  return { ok: true, industries: await listPlatformIndustries() };
});
