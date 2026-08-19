// QUALITY — the controlled-document register.
//
// Rows live under the studio's *quality-documents* sub-section:
//   s:<StudioID>:sec:<SectionID>:c:qualityDocuments
//   s:<StudioID>:sec:<SectionID>:c:qualityTypes
//   s:<StudioID>:sec:<SectionID>:c:qualityRevisions
//
// WHAT MAKES A DOCUMENT "CONTROLLED" rather than merely stored is that three
// things about it are true from the moment it exists and stay true afterwards:
// it has a code nobody else has, that code never changes, and a document that
// has been issued can be withdrawn but not erased. Those three are enforced
// here rather than asked of whoever is using the screen.
//
// DEPARTMENTS ARE SECTIONS (lib/departments.js), so a document is filed against
// a top-level section key. Their short codes live in THIS section's own
// settings, not on the sections they name — Quality owning its numbering
// vocabulary is what stops a Quality setup screen from writing to Sales' row.

import { sectionViewable, sectionManageable, requirePermission, can } from "@/lib/access";
import { listSections, readCol, addRow, updateRow, deleteRow, updateSection } from "@/lib/data/sections";
import { studioContext, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { departmentsFromSections } from "@/lib/departments";
import { bumpCounter, claim, getIndex, release, touchTTL, setJSONEx } from "@/lib/data/store";
import { SEC, IX } from "@/lib/data/keys";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/identity";
import { moveSignable, availableMoves } from "@/lib/signables";
import { notifyCollaborators, NOTIFY } from "@/lib/data/notifications";
import {
  DOC_STATUSES, DEFAULT_STATUS, STATUS_LABELS, isControlled,
  DOC_LANGUAGES, directionOf,
  formatCode, cleanCodePart, defaultDeptCode, highestSeq,
  ISO_STARTER_TYPES, MAX_TYPES, MAX_TITLE, prefixTaken,
  TRANSITIONS, REV_LABELS, isOpen, documentState, pendingRevision, SIGNATURE_ROLES,
} from "@/lib/qualityDocuments";
import { cleanSections, startingSections, wordCount } from "@/lib/qualityContent";
import {
  SUBJECTS, subjectById, STATIC_FIELDS, availableFields, groupFields,
  legalFieldsFrom, legalKeyFor, availableBlocks, BLOCK_SOURCES, blockByKey, reachOf, isFieldKey,
} from "@/lib/qualityFields";
import { NODES, traverse } from "@/lib/relations";
import { CALL_POINTS, callPointById, callPointTaken, callPointOptions, homeFor } from "@/lib/qualityCallPoints";
import { netUnitPrice, discountPct } from "@/lib/quotations";
import { DEFAULT_TEMPLATE, PAGE_TOKENS } from "@/lib/qualityRender";

// Money as a document shows it. Two decimals and grouped thousands, without
// a currency symbol — the quotation names its own currency, and repeating it
// on every line is noise.
const money = (v) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format(Number(v) || 0);

const DOCUMENTS = "qualityDocuments";
const TYPES = "qualityTypes";

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

// Re-exported so a server-side caller keeps one import, the way lib/tasks.js
// re-exports lib/taskRouting.js.
export { availableMoves };
export {
  DOC_STATUSES, DEFAULT_STATUS, STATUS_LABELS, DOC_LANGUAGES,
  directionOf, isControlled, ISO_STARTER_TYPES,
  TRANSITIONS, REV_LABELS, documentState, pendingRevision,
};

// ---- context ---------------------------------------------------------------

export async function qualityContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` and `roles` travel with the context; dropping either is what
  // silently disarms every guard downstream.
  const { studio, collaborator, access, roles } = context;

  const sections = await listSections(studio.id);
  const keys = sections.map((s) => s.key);
  const section = sections.find((s) => s.key === "quality-documents");
  if (!section) return { error: "no-section" };
  if (!sectionViewable(access, section.key, keys)) return { error: "forbidden" };

  return {
    studio, collaborator, access, roles, section, sections,
    canManage: sectionManageable(access, section.key, keys),
    canSetup: can(access, "quality.documents.setup"),
    // Departments are the studio's own top-level sections, so this list is
    // whatever the studio is actually divided into today.
    departments: departmentsFromSections(sections),
    nav: sectionNav(studio, collaborator, sections, access),
  };
}

export async function qualityGuard(paramsPromise, { write, setup } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const q = await qualityContext(user, slug);
  if (q.error) {
    const status = q.error === "notfound" || q.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: q.error }, { status }) };
  }
  if (write && !q.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  if (setup && !q.canSetup) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return q;
}

// ---- department codes ------------------------------------------------------
//
// Held in the quality-documents section's own `settings`, as
// { <sectionKey>: "SAL" }. A department with no code yet answers with its
// default, so numbering works on a studio that has never opened setup.

export function departmentCodes(ctx) {
  const stored = ctx.section?.settings?.departmentCodes || {};
  const out = {};
  for (const d of ctx.departments) {
    out[d.id] = cleanCodePart(stored[d.id]) || defaultDeptCode(d.id);
  }
  return out;
}

export async function saveDepartmentCodes(ctx, body) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const incoming = body?.departmentCodes && typeof body.departmentCodes === "object" ? body.departmentCodes : {};
  const known = new Set(ctx.departments.map((d) => d.id));
  const next = { ...(ctx.section.settings?.departmentCodes || {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (!known.has(key)) continue;
    const code = cleanCodePart(value);
    if (!code) return { error: "code", department: key };
    next[key] = code;
  }
  // TWO DEPARTMENTS MAY NOT SHARE A CODE. They would mint the same document
  // number from two different places, and a code that is not unique is not a
  // code — it is a label that looks like one.
  const seen = new Map();
  for (const d of ctx.departments) {
    const code = next[d.id] || defaultDeptCode(d.id);
    if (seen.has(code)) return { error: "duplicate-code", code, departments: [seen.get(code), d.id] };
    seen.set(code, d.id);
  }

  const settings = { ...(ctx.section.settings || {}), departmentCodes: next };
  const updated = await updateSection(ctx.studio.id, ctx.section.id, { settings });
  return updated ? { departmentCodes: next } : { error: "notfound" };
}

// ---- document types --------------------------------------------------------

export async function listTypes(ctx) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, TYPES);
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)));
}

// The ISO starter pack, planted on request. Refuses once the studio has any
// type of its own: this is a way to start, not a way to reset, and a second
// press must never duplicate what the first one made.
export async function installStarterTypes(ctx) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const existing = await listTypes(ctx);
  if (existing.length) return { error: "not-empty" };

  const created = [];
  for (const [i, t] of ISO_STARTER_TYPES.entries()) {
    created.push(await addRow(ctx.studio.id, ctx.section.id, TYPES, {
      name: t.name, prefix: t.prefix, description: t.description, sortOrder: i,
      createdAt: new Date().toISOString(),
    }));
  }
  return { types: created };
}

export async function createType(ctx, body) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const name = str(body?.name, 60);
  const prefix = cleanCodePart(body?.prefix);
  if (!name) return { error: "name" };
  if (!prefix) return { error: "prefix" };

  const existing = await listTypes(ctx);
  if (existing.length >= MAX_TYPES) return { error: "too-many" };
  if (prefixTaken(existing, prefix)) return { error: "prefix-taken" };

  const type = await addRow(ctx.studio.id, ctx.section.id, TYPES, {
    name, prefix, description: str(body?.description, 400),
    sortOrder: existing.length, createdAt: new Date().toISOString(),
  });
  return { type };
}

export async function updateType(ctx, id, body) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const existing = await listTypes(ctx);
  const type = existing.find((t) => t.id === id);
  if (!type) return { error: "notfound" };

  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 60);
    if (!name) return { error: "name" };
    patch.name = name;
  }
  if (body?.description !== undefined) patch.description = str(body.description, 400);

  // THE PREFIX IS FROZEN once documents have been issued under it. Changing it
  // would leave every existing code claiming a type that no longer says that,
  // and renumbering them is exactly what a permanent code forbids.
  if (body?.prefix !== undefined) {
    const prefix = cleanCodePart(body.prefix);
    if (!prefix) return { error: "prefix" };
    if (prefix !== type.prefix) {
      const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
      if (documents.some((d) => d.typeId === id)) return { error: "prefix-in-use" };
      if (prefixTaken(existing, prefix, id)) return { error: "prefix-taken" };
      patch.prefix = prefix;
    }
  }

  const updated = await updateRow(ctx.studio.id, ctx.section.id, TYPES, id, patch);
  return updated ? { type: updated } : { error: "notfound" };
}

export async function removeType(ctx, id) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  // A type that documents were filed under cannot be deleted: the documents
  // would be left naming a type that no longer exists, and their codes would
  // stop meaning anything.
  if (documents.some((d) => d.typeId === id)) return { error: "in-use" };

  const removed = await deleteRow(ctx.studio.id, ctx.section.id, TYPES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- documents -------------------------------------------------------------

export async function listDocuments(ctx) {
  const [documents, types, people, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    listTypes(ctx),
    listCollaborators(ctx.studio.id),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const typeName = Object.fromEntries(types.map((t) => [t.id, t.name]));
  const deptName = Object.fromEntries(ctx.departments.map((d) => [d.id, d.name]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  const today = new Date().toISOString().slice(0, 10);

  return [...documents]
    .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")))
    .map((d) => ({
      ...d,
      typeName: typeName[d.typeId] || "",
      departmentName: deptName[d.departmentId] || "",
      ownerAlias: alias[d.ownerCollaboratorId] || "",
      direction: directionOf(d.language),
      // STATE IS DERIVED, never stored. A stored copy is a second answer to a
      // question that already has one, and the two agree only until a transition
      // writes one and forgets the other.
      state: documentState(d, revisions),
      // "Effective, and rev 3 is with the approver" is two facts, and somebody
      // reading the register needs both.
      pending: pendingRevision(d, revisions),
      reviewOverdue: !!d.nextReviewDate && d.nextReviewDate < today && !d.obsoletedAt,
      controlled: isControlled(documentState(d, revisions)),
    }));
}

// THE NUMBER, minted atomically.
//
// bumpCounter runs its read-compare-write inside one Lua call, so two people
// creating a document in the same second get two different numbers rather than
// both reading the same tally. It also never goes backwards, which is what
// makes a deleted draft's number stay spent instead of being handed out again —
// a reused document code is indistinguishable from a forged one.
//
// The floor is read off the codes that already exist, so a studio holding
// documents from before this counter existed is picked up rather than restarted.
async function mintCode(ctx, { prefix, dept, documents }) {
  const key = `${SEC.prefix(ctx.studio.id, ctx.section.id)}seq`;
  const seq = await bumpCounter(key, `${prefix}-${dept}`, highestSeq(documents, prefix, dept));
  return formatCode(prefix, dept, seq);
}

export async function createDocument(ctx, body) {
  const denied = requirePermission(ctx.access, "quality.documents.create");
  if (denied) return denied;

  const title = str(body?.title, MAX_TITLE);
  if (!title) return { error: "title" };

  const [types, documents] = await Promise.all([
    listTypes(ctx),
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
  ]);
  const type = types.find((t) => t.id === str(body?.typeId, 60));
  if (!type) return { error: "type" };

  const departmentId = str(body?.departmentId, 60);
  if (!ctx.departments.some((d) => d.id === departmentId)) return { error: "department" };

  const language = DOC_LANGUAGES.some((l) => l.id === body?.language) ? body.language : "en";

  const ownerCollaboratorId = str(body?.ownerCollaboratorId, 60) || ctx.collaborator.id;
  const people = await listCollaborators(ctx.studio.id);
  if (!people.some((c) => c.id === ownerCollaboratorId)) return { error: "owner" };

  const code = await mintCode(ctx, { prefix: type.prefix, dept: departmentCodes(ctx)[departmentId], documents });

  const document = await addRow(ctx.studio.id, ctx.section.id, DOCUMENTS, {
    code, title, typeId: type.id, departmentId, ownerCollaboratorId, language,
    // Every document starts unissued. Revision 0 is deliberate: the first
    // revision anybody can hold in their hand is Rev 1, and it exists only once
    // the document has been through review and been published.
    //
    // No `status` field: the document's state is derived from its revisions —
    // see documentState — because a document can be effective and have its next
    // revision in review at the same time, and one field cannot say both.
    revision: 0,
    effectiveDate: "",
    nextReviewDate: day(body?.nextReviewDate),
    relatedDocumentIds: [],
    createdAt: new Date().toISOString(),
    createdByCollaboratorId: ctx.collaborator.id,
    updatedAt: new Date().toISOString(),
  });
  return { document };
}

export async function updateDocument(ctx, id, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  const document = documents.find((d) => d.id === id);
  if (!document) return { error: "notfound" };

  const patch = {};
  if (body?.title !== undefined) {
    const title = str(body.title, MAX_TITLE);
    if (!title) return { error: "title" };
    patch.title = title;
  }
  if (body?.nextReviewDate !== undefined) patch.nextReviewDate = day(body.nextReviewDate);
  // A TEMPLATE IS STILL A CONTROLLED DOCUMENT — it gets a code, revisions and
  // two signatures like any other. The flag only says that this one is a blank
  // to be filled rather than a procedure to be followed, which is the
  // distinction the starter pack's Form and Record types already name.
  if (body?.isTemplate !== undefined) patch.isTemplate = Boolean(body.isTemplate);
  if (body?.language !== undefined && DOC_LANGUAGES.some((l) => l.id === body.language)) {
    patch.language = body.language;
  }
  if (body?.ownerCollaboratorId !== undefined) {
    const owner = str(body.ownerCollaboratorId, 60);
    const people = await listCollaborators(ctx.studio.id);
    if (!people.some((c) => c.id === owner)) return { error: "owner" };
    patch.ownerCollaboratorId = owner;
  }
  // Re-filing a document changes where it is found, NOT what it is called.
  // The code was minted from the type and department it had on the day it was
  // created, and it stays that code — it is already printed on paper, quoted in
  // other documents and recorded in whatever referenced it.
  if (body?.typeId !== undefined) {
    const types = await listTypes(ctx);
    if (!types.some((t) => t.id === body.typeId)) return { error: "type" };
    patch.typeId = str(body.typeId, 60);
  }
  if (body?.departmentId !== undefined) {
    if (!ctx.departments.some((d) => d.id === body.departmentId)) return { error: "department" };
    patch.departmentId = str(body.departmentId, 60);
  }
  if (body?.relatedDocumentIds !== undefined) {
    const known = new Set(documents.map((d) => d.id));
    patch.relatedDocumentIds = [...new Set((Array.isArray(body.relatedDocumentIds) ? body.relatedDocumentIds : [])
      .map(String).filter((x) => known.has(x) && x !== id))].slice(0, 10);
  }

  if (!Object.keys(patch).length) return { document };
  patch.updatedAt = new Date().toISOString();
  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, id, patch);
  return updated ? { document: updated } : { error: "notfound" };
}

export async function removeDocument(ctx, id) {
  const denied = requirePermission(ctx.access, "quality.documents.delete");
  if (denied) return denied;

  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  const document = documents.find((d) => d.id === id);
  if (!document) return { error: "notfound" };

  // THE LINE BETWEEN A DRAFT AND A CONTROLLED DOCUMENT. Something that was
  // never issued is somebody's abandoned work and may be thrown away. Something
  // that HAS been issued is retained even after it is withdrawn — obsolete
  // versions are kept on purpose, because proving what the instruction used to
  // say is the whole point of controlling it.
  //
  // Asked of the REVISIONS, not of a status field. Whether a document was ever
  // issued is a fact about what exists, and a fact cannot drift the way a
  // duplicated field can.
  const revisions = await readCol(ctx.studio.id, ctx.section.id, REVISIONS);
  if (isControlled(documentState(document, revisions))) return { error: "controlled" };

  const removed = await deleteRow(ctx.studio.id, ctx.section.id, DOCUMENTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- the working draft ------------------------------------------------------
//
// CONTENT LIVES ON A REVISION, never on the document row. A document is the
// controlled thing — its code, who owns it, when it is next due for review —
// and a revision is what it actually said on a given day. Keeping the two apart
// from the start is what lets an issued revision stay readable, byte for byte,
// while the next one is being written over the top of it.
//
// Today there is only ever one revision per document and it is always a draft;
// review, approval and superseding arrive with the workflow. The shape is
// already right for them, so none of this has to move when they land.

const REVISIONS = "qualityRevisions";

// How long a lock survives without a heartbeat. Long enough that a slow save or
// a tab switch does not drop it, short enough that a closed laptop frees the
// document while somebody is still standing at the desk wondering.
export const LOCK_TTL_SEC = 120;
const lockKey = (ctx, documentId) => `${SEC.prefix(ctx.studio.id, ctx.section.id)}lock:${documentId}`;

// WHO HOLDS THE DOCUMENT, and whether that is us.
//
// The lock is a Redis key with a TTL rather than a field on the revision, and
// that is the whole reason it works: a browser that goes away without releasing
// it cannot strand the document, because the key expires on its own. A field
// would need somebody to come along and decide it had gone stale.
export async function lockState(ctx, documentId) {
  const holder = await getIndex(lockKey(ctx, documentId));
  if (!holder) return { holder: "", holderAlias: "", mine: false };
  if (holder === ctx.collaborator.id) return { holder, holderAlias: "", mine: true };
  const people = await listCollaborators(ctx.studio.id);
  return { holder, holderAlias: people.find((c) => c.id === holder)?.alias || "Someone", mine: false };
}

// Take the document, or report who already has it. `force` is the take-over:
// deliberate, announced on screen, and written down — not something that
// happens because somebody clicked into a field.
export async function acquireLock(ctx, documentId, { force = false } = {}) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const key = lockKey(ctx, documentId);
  if (await claim(key, ctx.collaborator.id, LOCK_TTL_SEC)) return { lock: { holder: ctx.collaborator.id, mine: true } };

  const current = await lockState(ctx, documentId);
  if (current.mine) {
    // Already ours — this is the heartbeat, and re-arming the TTL is the point.
    await touchTTL(key, LOCK_TTL_SEC);
    return { lock: { ...current, mine: true } };
  }
  if (!force) return { error: "locked", lock: current };

  // Release-then-claim rather than an overwrite. Two people forcing at the same
  // instant is a race whose worst outcome is that the second one wins, which is
  // exactly what would happen if they had clicked a second apart.
  await release(key);
  await claim(key, ctx.collaborator.id, LOCK_TTL_SEC);
  return { lock: { holder: ctx.collaborator.id, mine: true }, tookOverFrom: current.holderAlias };
}

export async function releaseLock(ctx, documentId) {
  const current = await lockState(ctx, documentId);
  // Only the holder may let go. Otherwise closing a read-only tab would hand
  // somebody else's document away from underneath them.
  if (current.mine) await release(lockKey(ctx, documentId));
  return { ok: true };
}

// The draft revision for a document, created on first open. Creating it is not
// an edit — opening a document that has never been written is how it gets
// written — so it needs only the view right, and every write below is guarded
// on its own.
export async function openDraft(ctx, documentId) {
  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  const revisions = await readCol(ctx.studio.id, ctx.section.id, REVISIONS);
  const mine = revisions.filter((r) => r.documentId === documentId);

  // WHICHEVER REVISION THIS DOCUMENT IS CURRENTLY ABOUT: the one still open if
  // there is one, otherwise the issued one. Only a document that has never been
  // written at all gets a revision minted for it here.
  //
  // It used to mint one whenever no DRAFT existed, which was harmless while
  // nothing could be issued and quietly wrong the moment something could —
  // opening an effective document to read it would have started rev 2 with
  // nobody asking for it. Starting the next revision is a deliberate act now:
  // see startRevision.
  let draft = mine.find((r) => isOpen(r.state)) || mine.find((r) => r.state === "effective") || null;

  if (!draft) {
    // Nothing to write into yet, so this branch CREATES a record and asks for
    // the right to do it like every other write in the studio. A refusal here
    // is not an error, though: it means "you may read this, you just don't get
    // to be the person who started writing it" — otherwise a viewer opening a
    // document would silently author its first revision, and the register would
    // show authorship that never happened.
    const denied = requirePermission(ctx.access, "quality.documents.edit");
    if (denied) return {
      document: { ...document, state: documentState(document, revisions) },
      draft: null, sections: startingSections(), readOnly: true,
    };
    draft = await addRow(ctx.studio.id, ctx.section.id, REVISIONS, {
      documentId, rev: (Number(document.revision) || 0) + 1, state: "draft",
      sections: startingSections(),
      authorCollaboratorId: ctx.collaborator.id,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, { draftRevisionId: draft.id });
  }

  // The state travels WITH the document, resolved here where the revisions are
  // already in hand. Every caller downstream — the builder, the reader, the PDF
  // route deciding whether to stamp DRAFT across the page — was otherwise
  // reading a row that no longer carries one, and would have stamped every
  // issued document as a draft.
  return {
    document: { ...document, state: documentState(document, revisions) },
    draft,
    sections: cleanSections(draft.sections),
  };
}

export async function saveDraft(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const opened = await openDraft(ctx, documentId);
  if (opened.error) return opened;
  if (!opened.draft) return { error: "no-draft" };

  // AN APPROVED REVISION IS IMMUTABLE, and so is one somebody is part-way
  // through reviewing. The whole value of a signature is that it was given
  // against particular words; text that can still move afterwards makes the
  // signature evidence of nothing.
  if (!["draft", "rejected"].includes(opened.draft.state)) return { error: "not-editable", state: opened.draft.state };

  // THE LOCK IS CHECKED AT THE WRITE, not only when the screen was opened. A
  // tab that has been sitting open since before somebody else took the document
  // still believes it holds it, and believing is not holding.
  const lock = await lockState(ctx, documentId);
  if (lock.holder && !lock.mine) return { error: "locked", lock };

  // Everything the client sent goes through the allowlist before it is stored.
  // This is the boundary the whole content model rests on — see
  // lib/qualityContent.js.
  const sections = cleanSections(body?.sections);

  const updated = await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, opened.draft.id, {
    sections,
    updatedAt: new Date().toISOString(),
    lastEditedByCollaboratorId: ctx.collaborator.id,
  });
  if (!updated) return { error: "notfound" };

  // The document row carries the summary the register reads, so a list of three
  // hundred documents never has to load three hundred revisions to say how long
  // each one is.
  await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
    updatedAt: updated.updatedAt,
    words: wordCount(sections),
  });

  // Keep the lock alive on the way through: somebody who is typing is plainly
  // still here, and making them heartbeat separately is a second timer to get
  // wrong.
  await touchTTL(lockKey(ctx, documentId), LOCK_TTL_SEC);

  return { revision: updated, sections };
}

// ---- rendering a document ---------------------------------------------------

// Dotted into a record: "location.city" off a sales ticket.
const dotted = (obj, path) =>
  String(path || "").split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

// Reads any joined collection, resolving its section from the registry.
const readerFor = (ctx) => async (node) => {
  const n = NODES[node];
  const section = ctx.sections.find((x) => x.key === n.sectionKey);
  return section ? readCol(ctx.studio.id, section.id, n.collection) : [];
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
  const rows = await readCol(ctx.studio.id, section.id, subject.collection);
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
export async function mergeValuesFor(ctx, document, { types = null, rev = null } = {}) {
  const [list, people] = await Promise.all([
    types ? Promise.resolve(types) : listTypes(ctx),
    listCollaborators(ctx.studio.id),
  ]);
  const type = list.find((t) => t.id === document.typeId);
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
    "document.type": type?.name || "",
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
  const rows = await readCol(ctx.studio.id, section.id, subject.collection);
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
      const rows = section ? await readCol(ctx.studio.id, section.id, subject.collection) : [];
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
  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
    subjectType: subjectType || "", subjectId: "",
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "notfound" };
  await audit(ctx, {
    documentId, action: "subject.bound",
    detail: subjectType ? `${subjectById(subjectType).label}` : "Unbound",
  });
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

// ---- the audit trail --------------------------------------------------------
//
// APPEND-ONLY, and the reason the rest of this module can be trusted. A control
// system that cannot say who did what and when is a filing cabinet with a nicer
// font: the question an auditor actually asks is not "is this approved" but
// "show me that it was, and by whom, and when". Every transition below writes
// one row, and nothing in the product deletes one.

const AUDIT = "qualityAudit";

async function audit(ctx, { documentId, revisionId = "", action, detail = "" }) {
  return addRow(ctx.studio.id, ctx.section.id, AUDIT, {
    documentId, revisionId, action, detail,
    byCollaboratorId: ctx.collaborator.id,
    byAlias: ctx.collaborator.alias || "",
    at: new Date().toISOString(),
  });
}

export async function listAudit(ctx, documentId) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, AUDIT);
  return rows
    .filter((r) => !documentId || r.documentId === documentId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export async function listRevisions(ctx, documentId) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, REVISIONS);
  return rows
    .filter((r) => !documentId || r.documentId === documentId)
    .sort((a, b) => (b.rev ?? 0) - (a.rev ?? 0));
}

// ---- starting the next revision ---------------------------------------------
//
// EDITING AN ISSUED DOCUMENT NEVER CHANGES IT. It opens the next revision, and
// the issued one stays exactly as it is — readable, exportable, and still the
// document anybody working from it is working from — until the new one is
// published over the top. That is the difference between a version history and
// document control.
export async function startRevision(ctx, documentId) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };
  if (document.obsoletedAt) return { error: "obsolete" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  // One open revision at a time. Two people drafting two different "next"
  // revisions is two documents wearing one code.
  if (mine.some((r) => isOpen(r.state))) return { error: "already-open" };

  const effective = mine.find((r) => r.state === "effective");
  const draft = await addRow(ctx.studio.id, ctx.section.id, REVISIONS, {
    documentId, rev: (Number(effective?.rev) || 0) + 1, state: "draft",
    // The new revision STARTS FROM WHAT THE DOCUMENT CURRENTLY SAYS. Beginning
    // from a blank page would mean retyping a procedure to change a sentence.
    sections: cleanSections(effective?.sections),
    authorCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, { draftRevisionId: draft.id });
  await audit(ctx, { documentId, revisionId: draft.id, action: "revision.started", detail: `Rev ${draft.rev}` });
  return { revision: draft };
}

// ---- the transitions --------------------------------------------------------

// Who a revision is waiting on, so the screen can say "with Sara" rather than
// "in review" — the second tells nobody what to do next.
const waitingOn = (document, state) =>
  state === "review" ? document.reviewerCollaboratorId
    : state === "approval" ? document.approverCollaboratorId
      : "";

/**
 * Move a revision along the ladder.
 *
 * The MACHINE lives in lib/signables.js now, because a generated document goes
 * through the same review and approval and lives in another module entirely.
 * What stays here is the part that is about a controlled document specifically:
 * finding the revision in play, and what publishing and withdrawing MEAN.
 */
export async function moveRevision(ctx, documentId, action, body = {}) {
  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  // Withdrawing acts on the ISSUED revision; everything else acts on the one
  // still open. They are never the same row.
  const current = action === "withdraw"
    ? mine.find((r) => r.state === "effective")
    : mine.find((r) => isOpen(r.state));

  const result = await moveSignable({
    access: ctx.access,
    actor: { id: ctx.collaborator.id, alias: ctx.collaborator.alias || "" },
    transitions: TRANSITIONS,
    row: current,
    auditPrefix: "revision",

    apply: (patch) => updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, patch),

    // WHAT THE MOVE MEANS — the half that is not generic.
    after: async (moved, patch, now) => {
      if (moved === "publish") {
        const effectiveDate = day(body?.effectiveDate) || now.slice(0, 10);
        // The revision this one replaces is SUPERSEDED, not deleted. Retaining
        // withdrawn versions is the requirement, and it is also the only way to
        // answer "what did the procedure say in March".
        for (const r of mine) {
          if (r.state === "effective" && r.id !== current.id) {
            await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, r.id, { state: "superseded", supersededAt: now });
          }
        }
        await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
          revision: current.rev,
          effectiveRevisionId: current.id,
          effectiveDate,
          draftRevisionId: "",
          nextReviewDate: day(body?.nextReviewDate) || document.nextReviewDate || "",
          updatedAt: now,
        });
        await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, { effectiveDate });

        // AND THIS IS WHERE IT REACHES PEOPLE. Publishing without telling the
        // people who have to work to it is the commonest way a quality system
        // ends up with a current revision nobody has read.
        await distribute(ctx, document, { ...current, ...patch, effectiveDate });
      }

      if (moved === "withdraw") {
        await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
          obsoletedAt: now, obsoletedByCollaboratorId: ctx.collaborator.id, updatedAt: now,
        });
      }
    },

    audit: (entry) => audit(ctx, {
      documentId, revisionId: current.id, action: entry.action,
      detail: `Rev ${current.rev}${entry.note ? ` - ${entry.note}` : ""}`,
    }),

    notify: async (state) => {
      const next = waitingOn(document, state);
      if (!next || next === ctx.collaborator.id) return;
      await notifyCollaborators(ctx.studio.id, [next], {
        type: NOTIFY.system,
        title: `${document.code} needs you`,
        body: `${REV_LABELS[state]} - ${document.title}`,
        href: `/${ctx.studio.slug}/quality-documents/${documentId}`,
      }).catch(() => {});
    },
  }, action, body);

  if (result.error) return result;
  return { revision: result.row };
}

// ---- naming the two signers -------------------------------------------------
//
// Per document, not per role. "Whoever holds the approve right" is not an answer
// an auditor accepts, and it is not an answer that tells anybody whose desk a
// document is sitting on.
export async function setSigners(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const people = await listCollaborators(ctx.studio.id);
  const known = (id) => !id || people.some((c) => c.id === id);
  const reviewer = str(body?.reviewerCollaboratorId, 60);
  const approver = str(body?.approverCollaboratorId, 60);
  if (!known(reviewer) || !known(approver)) return { error: "signer" };
  // The same person cannot be both, for the same reason nobody may sign twice.
  if (reviewer && approver && reviewer === approver) return { error: "same-signer" };

  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
    reviewerCollaboratorId: reviewer, approverCollaboratorId: approver, updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "notfound" };
  await audit(ctx, { documentId, action: "signers.set", detail: "Reviewer and approver named" });
  return { document: updated };
}

// ---- distribution -----------------------------------------------------------
//
// "Ensure documented information is available where and when it is needed" is
// the half of document control that a register cannot satisfy on its own. A
// procedure nobody was told about is a procedure nobody follows, and the
// evidence an auditor asks for is not that it was published — it is that the
// people who have to work to it have SEEN THE CURRENT REVISION.
//
// So distribution is a list of named people on the document, and an
// acknowledgement row per person PER REVISION. Reading Rev 2 is not evidence of
// having read Rev 3, which is why publishing re-opens the question rather than
// carrying the old answers forward.

const ACKS = "qualityAcknowledgements";
const SHARES = "qualityShareLinks";

// Who the document is distributed to. A standing list on the document, because
// the audience of a purchasing procedure changes when the team does, not when
// the revision does.
export async function setDistribution(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const people = await listCollaborators(ctx.studio.id);
  const known = new Set(people.map((c) => c.id));
  const ids = [...new Set((Array.isArray(body?.collaboratorIds) ? body.collaboratorIds : []).map(String))]
    .filter((id) => known.has(id)).slice(0, 200);

  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
    distributionCollaboratorIds: ids, updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "notfound" };
  await audit(ctx, { documentId, action: "distribution.set", detail: `${ids.length} recipient(s)` });
  return { document: updated };
}

// Called when a revision goes effective. Mints one row per recipient AGAINST
// THAT REVISION and tells them it is waiting.
async function distribute(ctx, document, revision) {
  const ids = Array.isArray(document.distributionCollaboratorIds) ? document.distributionCollaboratorIds : [];
  if (!ids.length) return;

  const now = new Date().toISOString();
  for (const collaboratorId of ids) {
    await addRow(ctx.studio.id, ctx.section.id, ACKS, {
      documentId: document.id, revisionId: revision.id, rev: revision.rev,
      collaboratorId, assignedAt: now, assignedByCollaboratorId: ctx.collaborator.id,
      readAt: "", acknowledgedAt: "",
    });
  }

  await notifyCollaborators(ctx.studio.id, ids, {
    type: NOTIFY.system,
    title: `${document.code} rev ${revision.rev} is now in force`,
    body: `${document.title} — please read and acknowledge`,
    href: `/${ctx.studio.slug}/quality-documents/${document.id}/preview`,
  }).catch(() => {});

  await audit(ctx, {
    documentId: document.id, revisionId: revision.id,
    action: "distribution.issued", detail: `Sent to ${ids.length} person(s)`,
  });
}

// Opening it is not the same as accepting it, so the two are recorded
// separately: `readAt` happens by looking, `acknowledgedAt` only when somebody
// says so. An audit asks for the second.
export async function markRead(ctx, documentId) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, ACKS);
  const mine = rows.find((r) => r.documentId === documentId
    && r.collaboratorId === ctx.collaborator.id && !r.readAt);
  if (!mine) return { ok: true };
  await updateRow(ctx.studio.id, ctx.section.id, ACKS, mine.id, { readAt: new Date().toISOString() });
  return { ok: true };
}

export async function acknowledge(ctx, documentId) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, ACKS);
  // Only ever your OWN. Acknowledging on somebody else's behalf is the one
  // thing that would make the whole record worthless.
  const mine = rows.find((r) => r.documentId === documentId
    && r.collaboratorId === ctx.collaborator.id && !r.acknowledgedAt);
  if (!mine) return { error: "nothing-to-acknowledge" };

  const now = new Date().toISOString();
  await updateRow(ctx.studio.id, ctx.section.id, ACKS, mine.id, {
    acknowledgedAt: now, readAt: mine.readAt || now,
  });
  await audit(ctx, {
    documentId, revisionId: mine.revisionId,
    action: "distribution.acknowledged", detail: `Rev ${mine.rev}`,
  });
  return { ok: true };
}

// The chase list: who has it, who has opened it, who has not.
export async function distributionOf(ctx, documentId) {
  const [rows, people, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, ACKS),
    listCollaborators(ctx.studio.id),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const effective = revisions.find((r) => r.documentId === documentId && r.state === "effective");
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  // ONLY THE CURRENT REVISION COUNTS. Somebody who acknowledged rev 1 has not
  // seen rev 2, and a list that showed them as done would be telling the studio
  // exactly the thing document control exists to prevent.
  const current = rows.filter((r) => r.documentId === documentId && (!effective || r.revisionId === effective.id));
  return {
    rev: effective?.rev ?? null,
    recipients: current.map((r) => ({
      id: r.id, collaboratorId: r.collaboratorId, alias: alias[r.collaboratorId] || "Unnamed",
      assignedAt: r.assignedAt, readAt: r.readAt || "", acknowledgedAt: r.acknowledgedAt || "",
    })).sort((a, b) => a.alias.localeCompare(b.alias)),
    outstanding: current.filter((r) => !r.acknowledgedAt).length,
  };
}

// ---- share links ------------------------------------------------------------
//
// The one door out of the studio. Four things hold it shut: its own permission,
// an expiry that cannot be omitted, a watermark on whatever comes through it,
// and a line in the audit trail for every open.
//
// A LINK IS BOUND TO ONE REVISION, not to the document. Publishing rev 3 must
// not silently change what an auditor was sent in March — a link that follows
// the document is a link whose contents you cannot testify to.

export const SHARE_MAX_DAYS = 365;
export const SHARE_DEFAULT_DAYS = 30;

export async function createShareLink(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.share");
  if (denied) return denied;

  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  // Only an ISSUED revision may leave the building. A draft shared outside the
  // studio is an uncontrolled document by definition — nobody has signed it, and
  // whoever receives it cannot tell that from the paper.
  const revision = revisions.find((r) => r.documentId === documentId && r.state === "effective");
  if (!revision) return { error: "not-issued" };

  const days = Math.min(Math.max(Math.trunc(Number(body?.days) || SHARE_DEFAULT_DAYS), 1), SHARE_MAX_DAYS);
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

  // THE INDEX IS THE ENFORCEMENT. Redis expires the key on the day the link
  // dies, so an expired link stops resolving without anything having to run —
  // no sweep to forget, no window where a stale link still works.
  await setJSONEx(IX.qshare(token), {
    studioId: ctx.studio.id, sectionId: ctx.section.id,
    documentId, revisionId: revision.id, expiresAt,
  }, days * 86400);

  const link = await addRow(ctx.studio.id, ctx.section.id, SHARES, {
    documentId, revisionId: revision.id, rev: revision.rev, token,
    createdByCollaboratorId: ctx.collaborator.id, createdAt: new Date().toISOString(),
    expiresAt, revokedAt: "", accessCount: 0, lastAccessAt: "",
  });
  await audit(ctx, {
    documentId, revisionId: revision.id, action: "share.created",
    detail: `Rev ${revision.rev}, expires ${expiresAt.slice(0, 10)}`,
  });
  return { link };
}

export async function revokeShareLink(ctx, linkId) {
  const denied = requirePermission(ctx.access, "quality.documents.share");
  if (denied) return denied;

  const rows = await readCol(ctx.studio.id, ctx.section.id, SHARES);
  const link = rows.find((r) => r.id === linkId);
  if (!link) return { error: "notfound" };

  // The row is KEPT and marked revoked. Deleting it would erase the fact that
  // the document once left the building, which is exactly what the trail is for.
  await release(IX.qshare(link.token));
  await updateRow(ctx.studio.id, ctx.section.id, SHARES, linkId, { revokedAt: new Date().toISOString() });
  await audit(ctx, { documentId: link.documentId, action: "share.revoked", detail: `Rev ${link.rev}` });
  return { ok: true };
}

export async function listShareLinks(ctx, documentId) {
  const rows = await readCol(ctx.studio.id, ctx.section.id, SHARES);
  const now = new Date().toISOString();
  return rows
    .filter((r) => r.documentId === documentId)
    .map((r) => ({ ...r, expired: !r.revokedAt && r.expiresAt < now }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ---- the letterhead ---------------------------------------------------------
//
// What sits at the top and bottom of every page. Held in this section's own
// settings beside the department codes, because it is the studio's decision
// about its own paper — and merged over the shipped default so a studio that
// has never opened the editor still gets a sensible letterhead rather than a
// blank strip.

const BAR_SLOTS = ["left", "center", "right"];

const cleanSlot = (raw) => {
  if (!raw) return null;
  const spec = typeof raw === "string" ? { type: "field", value: raw } : raw;
  if (spec.type === "text") return { type: "text", value: str(spec.value, 120) };
  const value = str(spec.value, 60);
  // A field nobody declared would render as a permanent blank, so it is refused
  // at the point of saving rather than left to be discovered on paper.
  if (!value || !(isFieldKey(value) || PAGE_TOKENS.some((t) => t.key === value))) return null;
  return { type: "field", value };
};

// A BAR IS ROWS, not one line. A letterhead is routinely three: the company on
// top, the address under it, the document's code and date under that. One row
// forced everything anybody wanted to say into three slots.
//
// A bar stored before rows existed is read as a single row, so no studio's
// letterhead is lost to the change.
const MAX_BAR_ROWS = 4;

const cleanRow = (raw, fallback) => {
  const out = {};
  for (const slot of BAR_SLOTS) out[slot] = cleanSlot(raw?.[slot]) ?? cleanSlot(fallback?.[slot]);
  return out;
};

const rowsOf = (raw) => {
  if (Array.isArray(raw?.rows)) return raw.rows;
  // The old shape: slots sitting directly on the bar.
  if (raw && (raw.left || raw.center || raw.right)) return [raw];
  return [];
};

const cleanBar = (raw, fallback) => {
  const incoming = rowsOf(raw);
  const fell = rowsOf(fallback);
  const rows = (incoming.length ? incoming : fell)
    .slice(0, MAX_BAR_ROWS)
    .map((r, i) => cleanRow(r, fell[i]));
  return {
    showLogo: Boolean(raw?.showLogo),
    rule: raw?.rule !== false,
    rows: rows.length ? rows : [cleanRow(null, fell[0])],
  };
};

export function letterheadFor(ctx) {
  const stored = ctx.section?.settings?.letterhead || null;
  const margins = { ...DEFAULT_TEMPLATE.margins, ...(stored?.margins || {}) };
  return {
    name: DEFAULT_TEMPLATE.name,
    pageSize: stored?.pageSize === "Letter" ? "Letter" : "A4",
    margins,
    header: cleanBar(stored?.header, DEFAULT_TEMPLATE.header),
    footer: cleanBar(stored?.footer, DEFAULT_TEMPLATE.footer),
  };
}

export async function saveLetterhead(ctx, body) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const current = letterheadFor(ctx);
  const next = {
    pageSize: body?.pageSize === "Letter" ? "Letter" : "A4",
    margins: {
      top: clampMm(body?.margins?.top, current.margins.top),
      right: clampMm(body?.margins?.right, current.margins.right),
      bottom: clampMm(body?.margins?.bottom, current.margins.bottom),
      left: clampMm(body?.margins?.left, current.margins.left),
    },
    header: cleanBar(body?.header, current.header),
    footer: cleanBar(body?.footer, current.footer),
  };

  const settings = { ...(ctx.section.settings || {}), letterhead: next };
  const updated = await updateSection(ctx.studio.id, ctx.section.id, { settings });
  if (!updated) return { error: "notfound" };
  await audit(ctx, { documentId: "", action: "letterhead.saved", detail: "Header and footer updated" });
  return { letterhead: next };
}

// A margin small enough to be unprintable is a margin that loses text to the
// edge of the sheet, so the range is clamped rather than trusted.
const clampMm = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 5 && n <= 60 ? Math.round(n) : fallback;
};

// ---- where a template is asked for ------------------------------------------

export async function listTemplates(ctx) {
  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  const revisions = await readCol(ctx.studio.id, ctx.section.id, REVISIONS);
  return documents
    .filter((d) => d.isTemplate)
    .map((d) => ({
      id: d.id, code: d.code, title: d.title,
      callPointId: d.callPointId || "",
      callPoint: callPointById(d.callPointId)?.label || "",
      subjectType: d.subjectType || "",
      // A BLANK NOBODY HAS APPROVED CANNOT ISSUE ANYTHING, so setup says whether
      // this template is actually usable rather than leaving somebody to press a
      // button that refuses.
      issued: revisions.some((r) => r.documentId === d.id && r.state === "effective"),
      state: documentState(d, revisions),
    }))
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

// BINDING A TEMPLATE TO A CALL POINT SETS ITS SUBJECT, rather than asking for it
// separately. A button in the quotation viewer hands over a quotation; a
// template bound there that believed it was about something else would resolve
// nothing and print a page of gaps.
export async function setCallPoint(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.setup");
  if (denied) return denied;

  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };
  if (!document.isTemplate) return { error: "not-a-template" };

  const id = str(body?.callPointId, 60);
  if (!id) {
    const cleared = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
      callPointId: "", updatedAt: new Date().toISOString(),
    });
    await audit(ctx, { documentId, action: "callpoint.cleared", detail: "No longer requested from anywhere" });
    return { document: cleared };
  }

  const point = callPointById(id);
  if (!point) return { error: "unknown-call-point" };
  // One call point, one template.
  if (callPointTaken(documents.filter((d) => d.isTemplate), id, documentId)) return { error: "call-point-taken" };

  const updated = await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
    callPointId: id,
    subjectType: point.subject,
    // The preview binding belonged to the old subject, so it is dropped rather
    // than left pointing at a record of the wrong kind.
    subjectId: document.subjectType === point.subject ? (document.subjectId || "") : "",
    updatedAt: new Date().toISOString(),
  });
  await audit(ctx, { documentId, action: "callpoint.set", detail: point.label });
  return { document: updated };
}

// WHETHER A BUTTON CAN ACTUALLY PRODUCE ANYTHING, and why not when it cannot.
//
// Asked before the button is drawn, so a press always succeeds. Every reason is
// named rather than collapsed into a boolean, because "nothing happened" is the
// worst thing a button can do — a studio that has not bound a template and a
// studio whose template is still awaiting approval need different things done
// about it.
export async function callPointReady(ctx, callPointId) {
  const template = await templateForCallPoint(ctx, callPointId);
  if (!template) return { ready: false, reason: "no-template" };

  const revisions = await readCol(ctx.studio.id, ctx.section.id, REVISIONS);
  const issued = revisions.some((r) => r.documentId === template.id && r.state === "effective");
  // A blank nobody has approved is not a blank anybody may issue from.
  if (!issued) return { ready: false, reason: "not-issued", code: template.code };
  if (!can(ctx.access, "quality.documents.create")) return { ready: false, reason: "forbidden" };

  return { ready: true, templateId: template.id, code: template.code, title: template.title };
}

// The template a given button should run, if a studio has bound one.
export async function templateForCallPoint(ctx, callPointId) {
  const documents = await readCol(ctx.studio.id, ctx.section.id, DOCUMENTS);
  return documents.find((d) => d.isTemplate && d.callPointId === callPointId) || null;
}

export { CALL_POINTS, callPointOptions };

// ---- generated documents ----------------------------------------------------
//
// A TEMPLATE IS A BLANK; AN INSTANCE IS THE FILLED-IN ONE. The starter pack has
// named that pair since the first day of this module — Form, "controlled because
// the blank is", and Record, "evidence that something happened".
//
// The instance lives in the SOURCE MODULE, beside the record it is about, not in
// the Quality register. Quality owns the blank. Putting ten thousand delivery
// notes in the register would bury the thing an auditor actually needs.
//
// And it FREEZES. Everything the template pointed at is resolved once, at
// generation, and stored: the values, the block rows, the answers, and which
// template revision it came from. A quotation sent in March prints March's terms
// and March's prices forever, because evidence that changes after the fact is
// not evidence.

const GENERATED = "generatedDocuments";

// Where an instance for this subject lives — the section that owns the record.
function hostSection(ctx, subject) {
  return ctx.sections.find((x) => x.key === subject.sectionKey) || null;
}

/**
 * Produce a document from a template, bound to one record.
 *
 * Everything is resolved HERE and stored. Nothing about the instance is a
 * reference afterwards, which is exactly the difference between the template
 * (carried) and the instance (evidence).
 */
export async function generateDocument(ctx, body) {
  const denied = requirePermission(ctx.access, "quality.documents.create");
  if (denied) return denied;

  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const template = documents.find((d) => d.id === str(body?.templateId, 60));
  if (!template) return { error: "notfound" };
  if (!template.isTemplate) return { error: "not-a-template" };

  // A BLANK NOBODY HAS APPROVED IS NOT A BLANK ANYBODY MAY ISSUE FROM. This is
  // the whole reason a template is a controlled document in the first place.
  const source = revisions.find((r) => r.documentId === template.id && r.state === "effective");
  if (!source) return { error: "not-issued" };

  const subject = subjectById(template.subjectType);
  if (!subject) return { error: "no-subject" };
  if (!can(ctx.access, subject.permission)) return { error: "forbidden" };

  const host = hostSection(ctx, subject);
  if (!host) return { error: "no-section" };

  const subjectId = str(body?.subjectId, 60);
  const records = await readCol(ctx.studio.id, host.id, subject.collection);
  const record = records.find((r) => r.id === subjectId);
  if (!record) return { error: "no-record" };

  // ONE DOCUMENT PER TEMPLATE AND RECORD, AND IT IS BROUGHT UP TO DATE.
  //
  // A second press must not mint /0002 — that was three numbered records of one
  // thing, each needing its own review. But returning the first one untouched
  // was the opposite mistake: the document froze on the day it was first asked
  // for, so editing the template changed nothing anybody could see. Print is a
  // request to see the document AS IT STANDS.
  //
  // So the draft is re-made from the template's current issued revision and the
  // record's current data, keeping its number and its place in the trail.
  //
  // AN ISSUED ONE IS LEFT ALONE. Once it has been signed and dated it is
  // evidence, and evidence that quietly rewrites itself when somebody edits a
  // template is not evidence. That is the whole reason a snapshot exists — it
  // just should not begin at the first press.
  const existing = (await readCol(ctx.studio.id, host.id, GENERATED))
    .find((r) => r.templateId === template.id && r.subjectId === subjectId);

  if (existing) {
    if (!["draft", "rejected"].includes(existing.state)) {
      return { instance: existing, sectionId: host.id, reused: true, frozen: true };
    }
    const fresh = await snapshotFor(ctx, template, source, subject, record, body?.inputs ?? existing.inputs);
    const updated = await updateRow(ctx.studio.id, host.id, GENERATED, existing.id, {
      ...fresh,
      templateRevisionId: source.id,
      templateRev: source.rev,
      state: "draft",
      // A signature belongs to the words it was given against, so a refreshed
      // draft carries none.
      review: null, approval: null, rejection: null,
      generatedAt: new Date().toISOString(),
      generatedByCollaboratorId: ctx.collaborator.id,
    });
    await audit(ctx, {
      documentId: template.id, revisionId: source.id, action: "generated.refreshed",
      detail: `${existing.code} from rev ${source.rev}`,
    });
    return { instance: updated, sectionId: host.id, reused: true, refreshed: true };
  }

  const snapshot = await snapshotFor(ctx, template, source, subject, record, body?.inputs);
  const seq = await bumpCounter(
    `${SEC.prefix(ctx.studio.id, ctx.section.id)}gen`,
    template.code,
    highestGenerated(await readCol(ctx.studio.id, host.id, GENERATED), template.id),
  );

  const instance = await addRow(ctx.studio.id, host.id, GENERATED, {
    templateId: template.id,
    templateRevisionId: source.id,
    templateCode: template.code,
    templateRev: source.rev,
    subjectType: subject.id,
    subjectId,
    // BOTH NUMBERS. The record's own leads, because that is what people already
    // call this; the sequence is what makes the instance independently citable
    // in an audit trail.
    sourceNumber: String(record[subject.naming.primary] || ""),
    seq,
    code: `${template.code}/${String(seq).padStart(4, "0")}`,
    title: template.title,
    language: template.language || "en",
    ...snapshot,
    state: "draft",
    // Chosen per instance, every time.
    reviewerCollaboratorId: str(body?.reviewerCollaboratorId, 60),
    approverCollaboratorId: str(body?.approverCollaboratorId, 60),
    generatedAt: new Date().toISOString(),
    generatedByCollaboratorId: ctx.collaborator.id,
  });

  await audit(ctx, {
    documentId: template.id, revisionId: source.id, action: "generated",
    detail: `${instance.code} from rev ${source.rev}`,
  });
  return { instance, sectionId: host.id };
}

// The frozen content: the template's sections, plus everything they pointed at,
// resolved against THIS record.
async function snapshotFor(ctx, template, source, subject, record, rawInputs) {
  // mergeValuesFor and resolveBlocks both read the document's own binding, so
  // the template is handed a copy pointing at the record being generated FOR.
  const bound = { ...template, subjectType: subject.id, subjectId: record.id };
  const [values, blocks] = await Promise.all([
    mergeValuesFor(ctx, bound, { rev: source.rev }),
    resolveBlocks(ctx, bound),
  ]);

  // Only answers the template actually asks for. An input the template does not
  // contain is not an answer, it is somebody posting extra data into a record.
  const asked = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "inputField" && node.attrs?.name) asked.add(String(node.attrs.name));
    (node.content || []).forEach(walk);
  };
  for (const s of source.sections || []) walk(s.body);

  const inputs = {};
  for (const [k, v] of Object.entries(rawInputs && typeof rawInputs === "object" ? rawInputs : {})) {
    if (asked.has(String(k))) inputs[String(k)] = str(v, 2000);
  }

  return { sections: cleanSections(source.sections), values, blocks, inputs };
}

const highestGenerated = (rows, templateId) =>
  (rows || []).reduce((top, r) => (r.templateId === templateId ? Math.max(top, Number(r.seq) || 0) : top), 0);

// ---- reading them back ------------------------------------------------------

export async function listGenerated(ctx, { subjectType = "", subjectId = "" } = {}) {
  const out = [];
  for (const subject of SUBJECTS) {
    if (subjectType && subject.id !== subjectType) continue;
    if (!can(ctx.access, subject.permission)) continue;
    const host = hostSection(ctx, subject);
    if (!host) continue;
    const rows = await readCol(ctx.studio.id, host.id, GENERATED);
    for (const r of rows) {
      if (subjectId && r.subjectId !== subjectId) continue;
      out.push({ ...r, sectionId: host.id });
    }
  }
  return out.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
}

async function findInstance(ctx, instanceId) {
  for (const subject of SUBJECTS) {
    const host = hostSection(ctx, subject);
    if (!host) continue;
    const rows = await readCol(ctx.studio.id, host.id, GENERATED);
    const hit = rows.find((r) => r.id === instanceId);
    if (hit) return { instance: hit, host, subject };
  }
  return { instance: null, host: null, subject: null };
}

// THE SCREEN THIS DOCUMENT CAME FROM. Walked through the registry rather than
// stored, so it stays true when the routing moves — and it degrades to the
// register rather than to a broken link when a hop cannot be made.
export async function homeOf(ctx, instance) {
  const home = homeFor(instance?.subjectType);
  if (!home) return `/${ctx.studio.slug}/quality-documents`;

  const subject = subjectById(instance.subjectType);
  const host = subject ? hostSection(ctx, subject) : null;
  if (!host) return `/${ctx.studio.slug}/quality-documents`;

  const record = (await readCol(ctx.studio.id, host.id, subject.collection))
    .find((r) => r.id === instance.subjectId);
  if (!record) return `/${ctx.studio.slug}/quality-documents`;

  if (!home.needs) return home.href(ctx.studio.slug, record);
  const hop = await traverse(instance.subjectType, record, home.needs, {
    read: readerFor(ctx),
    holds: (permission) => can(ctx.access, permission),
  });
  return home.href(ctx.studio.slug, record, hop.record);
}

export async function getGenerated(ctx, instanceId) {
  const { instance, subject } = await findInstance(ctx, instanceId);
  if (!instance) return { error: "notfound" };
  // The snapshot is frozen data, but it was resolved from a record — so reading
  // it still answers to that record's right. Freezing changes when the check
  // happens, not whether there is one.
  if (subject && !can(ctx.access, subject.permission)) return { error: "forbidden" };
  return { instance };
}

// ---- the same ladder, on a different record ---------------------------------

export async function moveGenerated(ctx, instanceId, action, body = {}) {
  const { instance, host } = await findInstance(ctx, instanceId);
  if (!instance) return { error: "notfound" };

  const result = await moveSignable({
    access: ctx.access,
    actor: { id: ctx.collaborator.id, alias: ctx.collaborator.alias || "" },
    transitions: TRANSITIONS,
    row: instance,
    auditPrefix: "generated",
    apply: (patch) => updateRow(ctx.studio.id, host.id, GENERATED, instance.id, patch),
    after: async (moved, patch, now) => {
      // An instance has no predecessor to supersede and nobody to distribute to
      // — it is one document about one record. Publishing simply dates it.
      if (moved === "publish") {
        await updateRow(ctx.studio.id, host.id, GENERATED, instance.id, {
          effectiveDate: day(body?.effectiveDate) || now.slice(0, 10),
        });
      }
    },
    audit: (entry) => audit(ctx, {
      documentId: instance.templateId, action: entry.action,
      detail: `${instance.code}${entry.note ? ` - ${entry.note}` : ""}`,
    }),
    notify: async (state) => {
      const next = state === "review" ? instance.reviewerCollaboratorId
        : state === "approval" ? instance.approverCollaboratorId : "";
      if (!next || next === ctx.collaborator.id) return;
      await notifyCollaborators(ctx.studio.id, [next], {
        type: NOTIFY.system,
        title: `${instance.code} needs you`,
        body: `${REV_LABELS[state]} - ${instance.title}`,
        href: `/${ctx.studio.slug}/quality-documents/generated/${instance.id}`,
      }).catch(() => {});
    },
  }, action, body);

  if (result.error) return result;
  return { instance: result.row };
}

// REJECTION MEANS REGENERATE, not hand-edit. The document is bound to a record;
// re-pulling is what keeps that true, and it is also why an instance needs no
// editor at all — its content only ever comes from here.
export async function regenerate(ctx, instanceId, body = {}) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const { instance, host, subject } = await findInstance(ctx, instanceId);
  if (!instance) return { error: "notfound" };
  if (!["draft", "rejected"].includes(instance.state)) return { error: "wrong-state", state: instance.state };
  if (!subject || !can(ctx.access, subject.permission)) return { error: "forbidden" };

  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const template = documents.find((d) => d.id === instance.templateId);
  // Deliberately the CURRENT effective revision, not the one it was made from:
  // regenerating is asking for the document as it would be issued today.
  const source = revisions.find((r) => r.documentId === instance.templateId && r.state === "effective");
  if (!template || !source) return { error: "not-issued" };

  const records = await readCol(ctx.studio.id, host.id, subject.collection);
  const record = records.find((r) => r.id === instance.subjectId);
  if (!record) return { error: "no-record" };

  const snapshot = await snapshotFor(ctx, template, source, subject, record,
    body?.inputs !== undefined ? body.inputs : instance.inputs);

  const updated = await updateRow(ctx.studio.id, host.id, GENERATED, instance.id, {
    ...snapshot,
    templateRevisionId: source.id,
    templateRev: source.rev,
    state: "draft",
    // The signatures go with the words they were given against. Keeping them
    // over a fresh snapshot would be a signature on a document nobody signed.
    review: null, approval: null, rejection: null,
    generatedAt: new Date().toISOString(),
    generatedByCollaboratorId: ctx.collaborator.id,
  });
  await audit(ctx, {
    documentId: instance.templateId, action: "generated.regenerated",
    detail: `${instance.code} from rev ${source.rev}`,
  });
  return { instance: updated };
}
