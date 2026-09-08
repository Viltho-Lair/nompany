import { route } from "@/platform/http/route";
import { engineContext } from "@/platform/engine/context";
import { summariseSection } from "@/platform/engine/summary";
import { listRecordTypes, listRecords } from "@/platform/engine/records";
import type { EngineContext } from "@/platform/engine/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE SECTION'S REGISTERS, SUMMARISED — what a department dashboard draws.
//
// SEVEN SECTIONS CARRY A "Dashboard ⬜" and five of them are sections whose
// whole content is engine registers. This is one route for all five rather than
// five routes: a register added under a section joins its dashboard with
// nobody remembering to, which is the same argument the generic record route
// makes for itself.
//
// IT MINTS NO PERMISSION KEY, and could not sensibly hold one. Every figure
// here is derived from rows the caller can already read: `listRecordTypes`
// hands back only the types they hold `engine.<key>.view` for, and
// `listRecords` asks that key again per register. So the summary is a VIEW of
// what the reader may already open, and a right of its own would either be
// unwithholdable (anybody who can see a register can count it themselves) or a
// second gate free to disagree with the first.
//
// WHICH MEANS THE TOTALS MOVE WITH THE READER, exactly as customer 360's do,
// and that is the design rather than a bug: a figure derived from records
// somebody may not open would leak the very thing the gate is for.
const spec = { auth: "studio", context: engineContext, body: false, name: "records/summary" };

export const GET = route(spec, async (c) => {
  // `request` is on every handler's argument — the wrapper puts it there, the
  // same way the ledger route reads its `from`/`to`. Typed loosely because
  // `RouteArgs` is an index signature and naming it in the parameter would
  // narrow the handler out of what `route` accepts.
  const url = new URL((c as EngineContext & { request: Request }).request.url);
  const sectionKey = String(url.searchParams.get("section") || "").trim();
  if (!sectionKey) return { error: "missing" };

  const { types } = await listRecordTypes(c);
  // IN THE ORDER THE SECTION ALREADY SHOWS THEM. The dashboard draws the
  // sub-section cards from `sections` (sortOrder, the order the engine planted
  // them in) and this panel sits directly beneath those cards — so returning
  // the stored ROW order would put the same eight registers in two different
  // orders a centimetre apart, which reads as a bug whichever one you look at
  // second. A type whose section is somehow absent sorts last rather than
  // throwing: it is still a register somebody can open.
  const orderOf = (typeKey: string) => {
    const s = c.sections.find((x) => x.key === `engine-${typeKey}`);
    return s ? s.sortOrder : Number.MAX_SAFE_INTEGER;
  };
  const mine = types
    .filter((t) => t.parentSectionKey === sectionKey)
    .sort((a, b) => orderOf(a.key) - orderOf(b.key));

  // NO REGISTERS IS AN EMPTY SUMMARY, NOT A REFUSAL. A reader entitled to none
  // of a section's registers, and a section that has none, are the same answer
  // from this route's point of view — and both are truthfully "nothing to
  // show" rather than "you may not". `listRecordTypes` makes the same argument
  // for handing back an empty catalogue.
  if (!mine.length) {
    return { section: sectionKey, registers: [], attention: [], total: 0, totalOverdue: 0, asOf: today() };
  }

  // READ PER REGISTER, THROUGH THE SERVICE THAT GUARDS IT. Reaching into the
  // collection directly would be one query instead of N and would skip the
  // per-type permission check that makes an engine right mean anything — the
  // exact shortcut `records.ts` exists to prevent.
  const perType = await Promise.all(mine.map(async (t) => {
    const got = await listRecords(c, t.key);
    return (got as { records?: unknown[] }).records || [];
  }));

  return {
    section: sectionKey,
    ...summariseSection(
      mine.map((t) => ({
        key: t.key, label: t.label, statuses: t.statuses,
        transitions: t.transitions, fields: t.fields,
      })),
      perType.flat() as Parameters<typeof summariseSection>[1],
      today(),
    ),
  };
});

// THE CLOCK IS READ ONCE, HERE, and travels in the response as `asOf`. The
// screen never reads its own — the rule the tender register and the operations
// week window already follow, so a figure and the date it was measured against
// can never disagree.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
