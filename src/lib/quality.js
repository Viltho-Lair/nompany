// WHAT IS LEFT OF THE OLD DOCUMENT MODULE.
//
// This file used to be the whole of Quality: types, numbering, the working
// draft and its lock, revisions and their ladder, distribution, share links,
// the letterhead, the templates and the generation that filled them. All of it
// is gone, replaced by the editor at /quality-documents and by
// lib/qualityDocs.js and lib/qualityDocRevisions.js.
//
// THREE THINGS SURVIVED, because they were never really about the old builder:
//
//   the context and the guard — how anybody gets into this section at all, and
//   what they may do once they are in. Every route in the new system asks the
//   same door.
//
//   the field resolution — what a document can READ from other departments. A
//   merge field is a key stored in the body; turning that key into a value
//   means walking the relations registry from the record the document is about
//   to the record the field lives on, permission-checked at every hop. That
//   machinery is the reason this module exists and none of it was tied to
//   sections.
//
//   the subject binding — which record a document is about, and the picker
//   that offers the candidates.
//
// Everything the old builder needed and nothing else needs was deleted rather
// than left to rot: a module nobody calls is a module nobody notices is wrong.

import { can, requirePermission } from "@/lib/access";
import { repo } from "@/lib/data/repo";
import { updateRow } from "@/lib/data/sections";
import { DOCS } from "@/lib/qualityDocs";
import { moduleContext } from "@/lib/modules/context";
import { listCollaborators } from "@/lib/data/collaborators";
import { departmentsFromSections } from "@/lib/departments";
import { NODES, traverse } from "@/lib/relations";
import {
  STATIC_FIELDS, BLOCK_SOURCES, availableFields, availableBlocks, groupFields,
  legalKeyFor, subjectById, SUBJECTS, reachOf,
} from "@/lib/qualityFields";

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

// ---- context ---------------------------------------------------------------

export const qualityContext = moduleContext({
  root: "quality-documents",
  // Departments are the studio's own top-level sections, so this list is
  // whatever the studio is actually divided into today.
  extend: ({ sections }) => ({ departments: departmentsFromSections(sections) }),
});

// ---- rendering a document ---------------------------------------------------

// Dotted into a record: "location.city" off a sales ticket.
const dotted = (obj, path) =>
  String(path || "").split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

// Reads any joined collection, resolving its section from the registry.
const readerFor = (ctx) => async (node) => {
  const n = NODES[node];
  const section = ctx.sections.find((x) => x.key === n.sectionKey);
  return section ? repo(n.collection).find({ studio: ctx.studio, section }) : [];
};

// EVERY RECORD THIS DOCUMENT CAN REACH, resolved once each.
//
// Grouped by record type rather than walked per field: a quotation cover letter
// naming six things about its ticket should traverse to that ticket once, not
// six times. Each hop is permission-checked against whoever is asking, so a
// record they may not read resolves to nothing and its fields print as gaps
// naming themselves.
async function reachedRecords(ctx, document, wanted) {
  const { subject, record } = await subjectRecord(ctx, document);
  const out = {};
  if (!subject || !record) return out;
  out[subject.id] = record;

  const read = readerFor(ctx);
  const holds = (permission) => can(ctx.access, permission);
  for (const target of wanted) {
    if (target === subject.id || out[target]) continue;
    if (!reachOf(subject.id, target, holds)) continue;
    const hop = await traverse(subject.id, record, target, { read, holds });
    if (hop.record) out[target] = hop.record;
  }
  return out;
}

// THE RECORD A DOCUMENT IS ABOUT, if it is about one.
//
// Permission-checked against whoever is asking, not against whoever bound it. A
// document that prints a client's contact details to somebody who may not open
// Sales would be a way of reading Sales without the right to — the document is
// the leak, and the check has to be here where the value is fetched.
async function subjectRecord(ctx, document) {
  const subject = subjectById(document?.subjectType);
  // `subjectId` is set by GENERATION, which points the template at the record it
  // is producing for; on a document being authored it is empty and the caller
  // supplies a preview id instead. Either way it is never persisted.
  if (!subject || !document?.subjectId) return { subject: null, record: null, allowed: false };
  if (!can(ctx.access, subject.permission)) return { subject, record: null, allowed: false };

  const section = ctx.sections.find((x) => x.key === subject.sectionKey);
  if (!section) return { subject, record: null, allowed: true };
  const rows = await repo(subject.collection).find({ studio: ctx.studio, section });
  return { subject, record: rows.find((r) => r.id === document.subjectId) || null, allowed: true };
}

// WHAT THE FIELDS SAY, resolved at the moment of rendering.
//
// Shared by the builder, the reader and the PDF route so all three resolve the
// same key to the same value — a document whose preview and print disagree about
// the client's name is worse than one with neither.
//
// A field that cannot be resolved is left OUT of the map rather than set to "".
// The renderer then prints its name in the gap, so an empty spot on a page says
// which field is empty instead of looking like a mistake in the text.
export async function mergeValuesFor(ctx, document, { rev = null } = {}) {
  const people = await listCollaborators(ctx.studio.id);
  const department = ctx.departments.find((d) => d.id === document.departmentId);
  const alias = (id) => people.find((c) => c.id === id)?.alias || "";

  const values = {
    "company.name": ctx.studio.name || "",
    "company.address": ctx.studio.location || "",
    "company.country": ctx.studio.country || "",
    "company.city": ctx.studio.city || "",
    "document.code": document.code || "",
    "document.title": document.title || "",
    "document.revision": `Rev ${rev ?? document.revision ?? 0}`,
    "document.department": department?.name || "",
    "document.owner": alias(document.ownerCollaboratorId),
    "document.effectiveDate": document.effectiveDate || "",
    "document.nextReviewDate": document.nextReviewDate || "",
    // The day this is being rendered, not the day the template was written.
    "misc.today": new Date().toISOString().slice(0, 10),
  };

  // The studio's own legal rows — VAT number, CR number, whatever it puts on its
  // paperwork. Keyed by a slug of the label so renaming "VAT No." to "VAT
  // Number" does not orphan every document that pointed at it.
  for (const row of Array.isArray(ctx.studio.legalInfo) ? ctx.studio.legalInfo : []) {
    if (row?.key) values[legalKeyFor(row.key)] = String(row.value ?? "");
  }

  // And every department field this document can REACH — its own record's, and
  // anything a declared path leads to. A cover letter held at a quotation
  // resolves the client's name by going up to the ticket, which is a hop the
  // registry knows about and this module no longer has to.
  const wanted = [...new Set(STATIC_FIELDS.filter((f) => f.subject).map((f) => f.subject))];
  const reached = await reachedRecords(ctx, document, wanted);
  for (const f of STATIC_FIELDS) {
    if (!f.subject) continue;
    const record = reached[f.subject];
    if (!record) continue;
    const raw = dotted(record, f.path);
    values[f.key] = f.via === "collaborator" ? alias(raw) : String(raw ?? "");
  }

  return values;
}

// THE ROWS A BLOCK RETURNS, resolved at render like everything else.
//
// Same two gates as a scalar field: the subject decides whether there is a
// record to read at all, and the permission decides whether THIS person may.
// A block they may not see resolves to nothing, and the renderer says which
// block is missing rather than leaving an unexplained hole in the page.
export async function resolveBlocks(ctx, document) {
  const reached = await reachedRecords(ctx, document, [...new Set(BLOCK_SOURCES.map((b) => b.subject))]);

  const out = {};
  for (const source of BLOCK_SOURCES) {
    const record = reached[source.subject];
    if (!record) continue;
    if (!can(ctx.access, source.permission)) continue;

    if (source.key === "quotation.lines") {
      // ONE TABLE PER NAMED GROUP. Flattening them into a single list and
      // pushing the group's name into the first row's description was not a
      // quotation — it was a quotation with its structure smeared into a text
      // column, and unreadable the moment there were three of them.
      //
      // itemsFromTables in quotations.js flattens for the TOTALS, where the
      // grouping genuinely does not matter. Copying that shape here copied the
      // mechanism without its reason.
      const groups = [];
      for (const table of Array.isArray(record.tables) ? record.tables : []) {
        const rows = [];
        let subtotal = 0;
        for (const r of table.rows || []) {
          const qty = Number(r.qty) || 0;
          const net = netUnitPrice(r);
          subtotal += qty * net;
          rows.push({
            description: r.description || "",
            unit: r.unit || "",
            qty: String(r.qty ?? ""),
            unitPrice: money(r.unitPrice),
            // WITH ITS SIGN ON IT. A discount is a percentage off the unit
            // price, and a bare "10" in a money column reads as ten of them.
            discount: Number(r.discount) ? `${discountPct(r.discount)}%` : "",
            amount: money(qty * net),
          });
        }
        if (rows.length) groups.push({ title: table.title || "", rows, subtotal: money(subtotal) });
      }
      out[source.key] = { columns: source.columns, groups };
    }

    if (source.key === "quotation.totals") {
      // READ OFF THE QUOTATION, not recomputed. computeTotals wrote these when
      // the document was priced; doing the arithmetic again here would be a
      // second answer, and the two would part company the first time either
      // rounding rule changed.
      const rate = Number(record.vatRate) || 0;
      out[source.key] = {
        columns: source.columns,
        rows: [
          { label: "Subtotal", value: money(record.subtotal) },
          { label: rate ? `VAT (${rate}%)` : "VAT", value: money(record.vat) },
          { label: "Total", value: money(record.total), strong: true },
        ],
      };
    }
  }
  return out;
}

// What the Insert block menu should offer.
export function blocksFor(ctx, document) {
  return availableBlocks({
    subjectType: document?.subjectType || null,
    holds: (permission) => can(ctx.access, permission),
  });
}

// What the Insert field menu should offer, grouped by department. Filtered by
// what the document is bound to AND by what this author holds — see the note in
// lib/qualityFields.js about why both filters are needed.
export function fieldsFor(ctx, document) {
  const holds = (permission) => can(ctx.access, permission);
  const fields = availableFields({
    subjectType: document?.subjectType || null,
    legalInfo: ctx.studio.legalInfo,
    holds,
  }).map((f) => ({ ...f, kind: "field" }));

  // BLOCKS BELONG IN THE SAME MENU. A quotation's tables and its totals are
  // content of the quotation exactly as its number is — the only difference is
  // that one resolves to a word and the others to rows. A separate button asked
  // the author to know which kind of thing they were reaching for before they
  // could go looking for it.
  const blocks = availableBlocks({ subjectType: document?.subjectType || null, holds })
    .map((b) => ({ key: b.key, label: b.label, group: b.group, kind: "block" }));

  const all = [...fields, ...blocks];
  return { fields: all, groups: groupFields(all) };
}

// The records a document may be bound to, for the picker. Permission-checked:
// a list of every sales ticket is itself Sales data.
export async function subjectOptions(ctx, subjectType) {
  const subject = subjectById(subjectType);
  if (!subject) return { error: "unknown-subject" };
  if (!can(ctx.access, subject.permission)) return { error: "forbidden" };

  const section = ctx.sections.find((x) => x.key === subject.sectionKey);
  if (!section) return { options: [] };
  const rows = await repo(subject.collection).find({ studio: ctx.studio, section });
  return {
    options: rows.slice(0, 500).map((r) => ({
      id: r.id,
      label: [r[subject.naming.primary], r[subject.naming.secondary]].filter(Boolean).join(" — "),
    })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

// BINDING IS OPTIONAL. A procedure is about nothing in particular and resolves
// its Company and Document fields perfectly well; binding is what makes a
// DEPARTMENT'S fields reachable, and it is the mechanism templates are built on.
export async function bindSubject(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const subjectType = str(body?.subjectType, 40);
  const subjectId = str(body?.subjectId, 60);

  if (subjectType) {
    const subject = subjectById(subjectType);
    if (!subject) return { error: "unknown-subject" };
    // Nobody may bind a document to a record they cannot see. Otherwise the
    // document becomes a way to read one.
    if (!can(ctx.access, subject.permission)) return { error: "forbidden" };
    if (subjectId) {
      const section = ctx.sections.find((x) => x.key === subject.sectionKey);
      const rows = section ? await repo(subject.collection).find({ studio: ctx.studio, section }) : [];
      if (!rows.some((r) => r.id === subjectId)) return { error: "no-record" };
    }
  }

  // ONLY THE TYPE IS WRITTEN DOWN. What a document is ABOUT is a property of the
  // document: it decides which fields can resolve at all. Which particular
  // record somebody happened to preview against is not — it is a rehearsal, and
  // storing it put a throwaway choice onto a controlled record that goes
  // through review and approval, where a reviewer would be signing off a field
  // that says who the author was looking at on Tuesday.
  //
  // The preview record now travels with the request instead. See `preview` in
  // mergeValuesFor and the content route.
  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCS, documentId, {
    subjectType: subjectType || "", subjectId: "",
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "notfound" };
  return { document: updated };
}

export { SUBJECTS };

// THE STAMP ACROSS THE PAGE, and the reason a printed copy cannot lie about
// what it is. A document that has not been issued must never be mistaken for
// one that has, and a withdrawn one must never be mistaken for current — those
// two confusions are precisely what document control exists to prevent, and
// they happen on paper, away from the screen that knew the difference.
export function watermarkFor(document) {
  const state = document?.state || (document?.obsoletedAt ? "obsolete" : "draft");
  if (state === "obsolete") return "OBSOLETE";
  if (state === "effective") return "";
  return "DRAFT";
}

