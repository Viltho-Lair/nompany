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

export async function plantTypeSection(
  studioId: string,
  decl: { key: string; label: string; parentSectionKey: string },
): Promise<Section | null> {
  const key = engineSectionKey(decl.key);
  return editArr<Section, Section | null>(S.sections(studioId), (current) => {
    const already = current.find((s) => s.key === key);
    if (already) return { result: already };

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
      sortOrder: current.length, settings: {},
      createdAt: new Date().toISOString(),
    };
    return { next: [...current, row], result: row };
  });
}
