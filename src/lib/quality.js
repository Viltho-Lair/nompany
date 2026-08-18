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
import { bumpCounter, claim, getIndex, release, touchTTL } from "@/lib/data/store";
import { SEC } from "@/lib/data/keys";
import { currentUser } from "@/lib/identity";
import {
  DOC_STATUSES, DEFAULT_STATUS, STATUS_LABELS, isControlled,
  DOC_LANGUAGES, directionOf,
  formatCode, cleanCodePart, defaultDeptCode, highestSeq,
  ISO_STARTER_TYPES, MAX_TYPES, MAX_TITLE, prefixTaken,
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
  const [documents, types, people] = await Promise.all([
    readCol(ctx.studio.id, ctx.section.id, DOCUMENTS),
    listTypes(ctx),
    listCollaborators(ctx.studio.id),
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
      // Both derived, so neither can go stale in storage.
      reviewOverdue: !!d.nextReviewDate && d.nextReviewDate < today && d.status !== "obsolete",
      controlled: isControlled(d.status),
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
    status: DEFAULT_STATUS,
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
  if (isControlled(document.status)) return { error: "controlled" };

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
  let draft = revisions.find((r) => r.documentId === documentId && r.state === "draft");

  if (!draft) {
    // Nothing to write into yet, so this branch CREATES a record and asks for
    // the right to do it like every other write in the studio. A refusal here
    // is not an error, though: it means "you may read this, you just don't get
    // to be the person who started writing it" — otherwise a viewer opening a
    // document would silently author its first revision, and the register would
    // show authorship that never happened.
    const denied = requirePermission(ctx.access, "quality.documents.edit");
    if (denied) return { document, draft: null, sections: startingSections(), readOnly: true };
    draft = await addRow(ctx.studio.id, ctx.section.id, REVISIONS, {
      documentId, rev: (Number(document.revision) || 0) + 1, state: "draft",
      sections: startingSections(),
      authorCollaboratorId: ctx.collaborator.id,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await updateRow(ctx.studio.id, ctx.section.id, DOCUMENTS, documentId, { draftRevisionId: draft.id });
  }

  return { document, draft, sections: cleanSections(draft.sections) };
}

export async function saveDraft(ctx, documentId, body) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const opened = await openDraft(ctx, documentId);
  if (opened.error) return opened;
  if (!opened.draft) return { error: "no-draft" };

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
  if (document?.status === "obsolete") return "OBSOLETE";
  if (document?.status === "effective") return "";
  return "DRAFT";
}
