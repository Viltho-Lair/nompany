// THE SUB-SECTION A RECORD TYPE PLANTS.
//
// PLANTED IN THE SAME WRITE AS THE TYPE ROW, never lazily on first use. A
// sub-section falls back to its ROOT when absent, so records written before the
// section exists land under the parent where nothing reads them — not deleted,
// not corrupted, invisible. The tender register paid for that once and this
// does not repeat it.
//
// `plantMissingSections` only ever ADDS to the stored array and sorts keys it
// does not recognise to the end, so a section planted here survives the
// catch-up rather than being wiped by it.
// `editArr` is the store's, `S` and `ID` are the key builders' — the same two
// imports `platform/db/sections.ts` uses, and for the same reason.
//
// `engineSectionKey` IS NOT DECLARED HERE, and that is deliberate: it lives in
// `platform/access/catalogue` because `sectionViewable` needs the same answer
// to render the planted section in the nav, and `platform/access` may not
// import this file. One definition of the namespace, imported by both halves.
import { S, ID } from "@/platform/db/keys";
import { engineSectionKey } from "@/platform/access";
import { editArr } from "@/platform/db/store";
import type { Section } from "@/platform/db/sections";

/**
 * HOW LONG ONE WRITER'S CLAIM TO SEED A TYPE HOLDS.
 *
 * The type ROW lives in `collection_rows`, one row each, where nothing can be
 * compare-and-set as a set and the engine can declare no uniqueness on `key`.
 * So "is it missing? then create it" is two steps, and two requests catching a
 * studio up at once would both create — two `ncr` types, one of which every
 * reader silently ignores. The SECTIONS document is one array under `editArr`,
 * so the claim is taken there: the writer whose compare-and-set stamps
 * `typeSeedClaimedAt` is the one that creates, and everybody else stands back.
 *
 * A LEASE, NOT A FLAG, because a claim whose holder crashed before writing the
 * row would otherwise stand for ever and the type would never arrive. A minute
 * is far longer than one row write takes and short enough that a crash repairs
 * itself on a later read.
 */
export const TYPE_SEED_LEASE_MS = 60_000;

export type PlantedTypeSection = { section: Section; fresh: boolean };

/**
 * PLANT A TYPE'S SUB-SECTION AND CLAIM THE RIGHT TO SEED ITS ROW, in one write.
 *
 * Answers the section when THIS caller holds the claim, and null when it does
 * not — either because the parent is absent (below) or because another writer
 * claimed it inside the lease. `at` is read ONCE by the caller, outside the
 * patch, because `editArr` may run the function more than once (invariant 8).
 *
 * `fresh` says whether THIS write planted the section. A fresh section cannot
 * have a type row yet — nobody seeds a row without first holding this claim —
 * so the caller may create at once. A section that already existed may have
 * been seeded by a writer who has since released its claim, so the caller must
 * look again before creating.
 */
export async function plantTypeSection(
  studioId: string,
  decl: { key: string; label: string; parentSectionKey: string },
  at: string = new Date().toISOString(),
): Promise<PlantedTypeSection | null> {
  const key = engineSectionKey(decl.key);
  return editArr<Section, PlantedTypeSection | null>(S.sections(studioId), (current) => {
    const already = current.find((s) => s.key === key);
    if (already) {
      const claimed = Date.parse(String(already.settings?.typeSeedClaimedAt || ""));
      if (Number.isFinite(claimed) && Date.parse(at) - claimed < TYPE_SEED_LEASE_MS) return { result: null };
      const row: Section = { ...already, settings: { ...(already.settings || {}), typeSeedClaimedAt: at } };
      return { next: current.map((s) => (s.id === already.id ? row : s)), result: { section: row, fresh: false } };
    }

    const parent = current.find((s) => s.key === decl.parentSectionKey);
    // A TYPE WHOSE PARENT IS NOT PLANTED IS NOT PLANTED EITHER. Returning null
    // rather than planting at the root: an orphan sub-section renders in no
    // nav and is harder to find than a refusal.
    if (!parent) return { result: null };

    const row: Section = {
      id: ID.subsection(), studioId, key, name: decl.label, parentId: parent.id,
      // A REGISTER IS ON EXACTLY WHEN ITS SECTION IS, and this line is a bug fix
      // rather than a tidy-up.
      //
      // It read `enabled: true`, unconditionally, and that was harmless while
      // every section a studio had was on. It stopped being harmless the day
      // creation began switching sections off by trade: `seedBuiltinTypes` runs
      // AFTER the section array is written, so a management consultancy came out
      // with `manufacturing` off and its four registers — work orders, bills of
      // materials, work stations, production batches — on.
      //
      // AND THAT IS WORSE THAN IT SOUNDS. StudioFrame PROMOTES a visible child
      // whose parent is hidden to the top level, on purpose, because a
      // sub-section can be granted without its parent. So the consultancy would
      // not have seen Manufacturing hidden; it would have seen four
      // manufacturing registers loose at the top of its nav, with no heading to
      // explain them. Measured in the sandbox: eighteen such rows across five
      // switched-off sections.
      enabled: parent.enabled !== false,
      sortOrder: current.length, settings: { typeSeedClaimedAt: at },
      createdAt: at,
    };
    return { next: [...current, row], result: { section: row, fresh: true } };
  });
}

/**
 * RECORD, ON EACH TYPE'S OWN SECTION, WHICH DECLARATION VERSION THIS STUDIO HAS
 * BEEN BROUGHT UP TO — and release the seeding claim. One write for the lot.
 *
 * THIS IS WHAT MAKES THE READ-PATH CATCH-UP FREE. `builtinTypesBehind`
 * (./builtins) answers from the section rows every request has already read:
 * a type is up to date when its section exists and carries this stamp at the
 * declaration's version. No type row is read to find that out, so an up-to-date
 * studio — every studio, almost always — pays nothing.
 *
 * IT ALSO RECORDS WHAT WAS PLANTED, which `plantMissingSections` says it will
 * need the day deletion ships: a stamped section is one this code seeded, not
 * one a studio never had.
 *
 * STAMPED AFTER THE TYPE ROW IS WRITTEN, never before, so a crash in between
 * leaves the studio "behind" and the next read finishes the job. Forward-only:
 * a stamp never goes down.
 */
export async function stampTypeSections(
  studioId: string,
  entries: readonly { key: string; version: number }[],
): Promise<void> {
  if (!entries.length) return;
  const want = new Map(entries.map((e) => [engineSectionKey(e.key), e.version]));
  await editArr<Section, null>(S.sections(studioId), (current) => {
    let changed = false;
    const next = current.map((s) => {
      const version = want.get(s.key);
      if (version === undefined) return s;
      const settings = { ...(s.settings || {}) };
      const had = Number(settings.builtinVersion) || 0;
      if (had >= version && !("typeSeedClaimedAt" in settings)) return s;
      settings.builtinVersion = Math.max(had, version);
      delete settings.typeSeedClaimedAt;
      changed = true;
      return { ...s, settings };
    });
    return changed ? { next, result: null } : { result: null };
  });
}
