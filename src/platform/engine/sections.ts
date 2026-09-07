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
      enabled: true, sortOrder: current.length, settings: {},
      createdAt: new Date().toISOString(),
    };
    return { next: [...current, row], result: row };
  });
}
