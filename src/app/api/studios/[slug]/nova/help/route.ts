import { route } from "@/platform/http/route";
import { studioHasNova } from "@/lib/plans";
import { helpPayload, helpSearch, helpVersionFor, studioFilter, type HelpLocale } from "@/lib/nova/help/knowledge";
import { getHelpAliases } from "@/lib/data/novaHelp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NOVA'S HELP DESK — the tree, and the matcher.
//
// GET hands the browser ONE LANGUAGE of the whole knowledge base, filtered to
// this studio's switched-on sections. The browser keeps it under its version,
// so every click down the tree after the first is answered from memory — the
// "main questions are cached" the owner asked for, without a cache anybody has
// to invalidate: the version IS the content's fingerprint, so a deploy that
// changes an answer changes it, and one that does not leaves every browser's
// copy valid.
//
// `?have=<version>` is the revalidation: a browser that already holds this
// version gets a few bytes back rather than the whole tree again.
//
// POST is a typed question. Matching runs HERE, not in the browser, because it
// ranks both languages at once and folds in the phrasings support has taught
// (`/super → Nova → Questions`), which live in the database.
//
// Gated like the rest of Nova: no Nova in the package, no help desk. What a
// member learns is the product's own documentation — no studio data is read —
// so membership (auth: "studio") is the whole of the authorisation.
const spec = { auth: "studio", name: "nova.help" } as const;

const localeOf = (v: unknown): HelpLocale => (v === "ar" ? "ar" : "en");

export const GET = route(spec, async (g) => {
  if (!(await studioHasNova(g.studio))) return { status: 403, body: { error: "nova-off" } };
  const url = new URL(g.request.url);
  const locale = localeOf(url.searchParams.get("locale"));
  const filter = studioFilter(g.sections as { key?: unknown; enabled?: unknown }[]);
  const version = helpVersionFor(locale, filter);
  if (url.searchParams.get("have") === version) return { version, unchanged: true };
  return helpPayload(locale, filter);
});

export const POST = route({ ...spec, body: true }, async (g) => {
  if (!(await studioHasNova(g.studio))) return { status: 403, body: { error: "nova-off" } };
  const body = (g.body || {}) as Record<string, unknown>;
  const q = typeof body.q === "string" ? body.q.slice(0, 500) : "";
  if (!q.trim()) return { error: "empty" };
  const exclude = Array.isArray(body.exclude) ? body.exclude.map(String).slice(0, 20) : [];
  const filter = studioFilter(g.sections as { key?: unknown; enabled?: unknown }[]);
  const aliases = await getHelpAliases();
  const decision = helpSearch(q, {
    filter,
    aliases: aliases.list,
    aliasStamp: aliases.stamp,
    view: typeof body.view === "string" ? body.view.slice(0, 80) : "",
    exclude,
  });
  // IDS ONLY. The browser already holds the entries in its own language; the
  // scores are an implementation detail, and shipping them would invite a
  // screen to start thresholding on a number whose scale moves with the KB.
  return {
    move: decision.move,
    top: "top" in decision ? decision.top.id : "",
    others: decision.others.map((h) => h.id),
  };
});
