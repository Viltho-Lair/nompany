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
import { notifyCollaborators, NOTIFY } from "@/lib/data/notifications";
import {
  DOC_STATUSES, DEFAULT_STATUS, STATUS_LABELS, isControlled,
  DOC_LANGUAGES, directionOf,
  formatCode, cleanCodePart, defaultDeptCode, highestSeq,
  ISO_STARTER_TYPES, MAX_TYPES, MAX_TITLE, prefixTaken,
  TRANSITIONS, REV_LABELS, isOpen, documentState, pendingRevision, SIGNATURE_ROLES,
} from "@/lib/qualityDocuments";
import { cleanSections, startingSections, wordCount } from "@/lib/qualityContent";

const DOCUMENTS = "qualityDocuments";
const TYPES = "qualityTypes";

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

// Re-exported so a server-side caller keeps one import, the way lib/tasks.js
// re-exports lib/taskRouting.js.
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

// WHAT THE MERGE FIELDS SAY, resolved from the studio at the moment of
// rendering. Shared by the builder, the reader and the PDF route so all three
// resolve the same field to the same value — a document whose preview and
// print disagree about the company's name is worse than one with neither.
export async function mergeValuesFor(ctx, document, { types = null, rev = null } = {}) {
  const [list, people] = await Promise.all([
    types ? Promise.resolve(types) : listTypes(ctx),
    listCollaborators(ctx.studio.id),
  ]);
  const type = list.find((t) => t.id === document.typeId);
  const department = ctx.departments.find((d) => d.id === document.departmentId);
  const owner = people.find((c) => c.id === document.ownerCollaboratorId);

  return {
    "company.name": ctx.studio.name || "",
    "company.address": ctx.studio.location || "",
    "company.country": ctx.studio.country || "",
    "company.city": ctx.studio.city || "",
    "document.code": document.code || "",
    "document.title": document.title || "",
    "document.revision": `Rev ${rev ?? document.revision ?? 0}`,
    "document.type": type?.name || "",
    "document.department": department?.name || "",
    "document.owner": owner?.alias || "",
    "document.effectiveDate": document.effectiveDate || "",
    "document.nextReviewDate": document.nextReviewDate || "",
  };
}

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
 * Move a revision along the ladder. ONE function for every transition, driven
 * by the table in lib/qualityDocuments.js, so the rules exist once — a screen
 * asking what is possible and a service deciding what is allowed read the same
 * declaration, and cannot come to different answers.
 */
export async function moveRevision(ctx, documentId, action, body = {}) {
  const move = TRANSITIONS[action];
  if (!move) return { error: "unknown-action" };

  const denied = requirePermission(ctx.access, move.permission);
  if (denied) return denied;

  const [documents, revisions] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    readCol(ctx.studio.id, ctx.section.id, REVISIONS),
  ]);
  const document = documents.find((d) => d.id === documentId);
  if (!document) return { error: "notfound" };

  const mine = revisions.filter((r) => r.documentId === documentId);
  const current = action === "withdraw"
    ? mine.find((r) => r.state === "effective")
    : mine.find((r) => isOpen(r.state));
  if (!current) return { error: "no-revision" };
  if (!move.from.includes(current.state)) return { error: "wrong-state", state: current.state };

  const now = new Date().toISOString();
  const patch = { state: move.to, updatedAt: now };

  // NOBODY SIGNS BOTH HALVES. Review and approval are two rights precisely so
  // they can be two people, and a revision carrying one person's name in both
  // slots has been reviewed by nobody. The check belongs here rather than in the
  // permission model, because holding both rights is legitimate and using both
  // on one revision is not.
  if (action === "approve" && current.review?.byCollaboratorId === ctx.collaborator.id) {
    return { error: "same-signer" };
  }

  if (action === "review" || action === "approve") {
    const slot = action === "review" ? "review" : "approval";
    patch[slot] = {
      byCollaboratorId: ctx.collaborator.id,
      byAlias: ctx.collaborator.alias || "",
      role: SIGNATURE_ROLES[slot],
      at: now,
      note: str(body?.note, 400),
      // Optional, and optional on purpose: a signature is a name, a role and a
      // moment. The graphic is decoration on top of that record, so a signature
      // without one is not a lesser signature.
      signatureUrl: /^\/api\/media\/[a-f0-9]{32}$/i.test(String(body?.signatureUrl || "")) ? body.signatureUrl : "",
    };
  }

  if (action === "reject") {
    patch.rejection = {
      byCollaboratorId: ctx.collaborator.id, byAlias: ctx.collaborator.alias || "",
      at: now, note: str(body?.note, 400),
    };
  }

  const updated = await updateRow(ctx.studio.id, ctx.section.id, REVISIONS, current.id, patch);
  if (!updated) return { error: "notfound" };

  // ---- what publishing does to everything else ----
  if (action === "publish") {
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

    // AND THIS IS WHERE IT REACHES PEOPLE. Publishing without telling the people
    // who have to work to it is the commonest way a quality system ends up with
    // a current revision nobody has read.
    await distribute(ctx, document, { ...current, ...patch, effectiveDate });
  }

  if (action === "withdraw") {
    await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, {
      obsoletedAt: now, obsoletedByCollaboratorId: ctx.collaborator.id, updatedAt: now,
    });
  }

  await audit(ctx, {
    documentId, revisionId: current.id, action: `revision.${action}`,
    detail: `Rev ${current.rev}${body?.note ? ` - ${str(body.note, 200)}` : ""}`,
  });

  // Tell whoever it now sits with. A workflow that waits silently is a workflow
  // that waits forever.
  const next = waitingOn(document, move.to);
  if (next && next !== ctx.collaborator.id) {
    await notifyCollaborators(ctx.studio.id, [next], {
      type: NOTIFY.system,
      title: `${document.code} needs you`,
      body: `${REV_LABELS[move.to]} - ${document.title}`,
      href: `/${ctx.studio.slug}/quality-documents/${documentId}`,
    }).catch(() => {});
  }

  return { revision: { ...current, ...patch } };
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
