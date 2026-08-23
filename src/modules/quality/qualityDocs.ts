// THE DOCUMENT STORE.
//
// This replaces the old builder's model outright. Where that one held a
// document as an ordered list of sections, each with its own ProseMirror body,
// this holds ONE body — because the editor that replaced it paginates by
// measuring a single ProseMirror instance, and a document split across several
// instances cannot be measured as one flow. Sections were the reason the old
// canvas could only ever draw one stretched page.
//
// WHAT CAME ACROSS FROM CONVEX, AND WHAT DID NOT. The document application this
// is ported from stored documents in Convex against a guest id kept in
// localStorage — its own source says plainly that such a check "decides what
// the UI offers, not what a determined caller can do". That is fine for a
// single-user toy and unacceptable here: every write in this studio goes
// through a permission guard, and the access suite proves it. So the shape of
// the record is Convex's, and the door in front of it is nompany's.
//
// Page setup is stored FLAT — pageSize, marginTopMm, headerContent — rather
// than nested. The editor wants it nested and converts on the way in and out;
// storing it flat is what lets a single toggle patch one field without reading
// and rewriting the whole setup.

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { bumpCounter } from "@/platform/db/store";
import { SEC } from "@/platform/db/keys";
import { formatCode, highestSeq, MAX_TITLE, documentState, pendingRevision, isOpen } from "./qualityDocuments";
import type { QualityContext, QualityDocument, QualityRevision } from "./types";

// A NEW COLLECTION, not the old one reused. The old rows carry `sections` and
// no `content`; letting them surface in the new register would show a list of
// documents that open empty. They are left where they are, readable by anything
// that still knows how, rather than migrated into a shape they do not fit.
export const DOCS = "qualityDocs";
export const REVISIONS = "qualityRevisions";

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ---- page setup --------------------------------------------------------------
//
// Every field is optional and every read falls back, so a document written
// before a field existed keeps working. That is the same bargain the Convex
// schema made, and it is the reason none of this is validated as a whole: a
// partial patch is the normal case, not the exception.

const PAGE_SIZES = ["a3", "a4", "a5", "letter", "legal", "tabloid"];
const MARGIN_PRESETS = ["normal", "narrow", "moderate", "wide", "custom"];
const ALIGNS = ["left", "center", "right"];
const NUMBER_POSITIONS = [
  "none",
  "header-left", "header-center", "header-right",
  "footer-left", "footer-center", "footer-right",
];

const oneOf = (list: readonly string[], v: unknown, fallback: string) => (list.includes(String(v)) ? String(v) : fallback);

// The fields a page-setup patch may carry, and how each is cleaned. Anything
// not named here is dropped rather than written — a client that invents a field
// must not be able to grow the record.
// Each entry cleans ONE field of a page-setup patch. Typed as a map of
// cleaners so `cleanSetup` can walk it without knowing which field is which.
const SETUP_FIELDS: Record<string, (v: unknown) => unknown> = {
  pageSize: (v) => oneOf(PAGE_SIZES, v, "a4"),
  marginPreset: (v) => oneOf(MARGIN_PRESETS, v, "normal"),
  // A margin wider than the paper leaves no body to print, so each is clamped
  // where it is saved rather than discovered on the page.
  marginTopMm: (v) => num(v, 0, 100, 20),
  marginRightMm: (v) => num(v, 0, 100, 20),
  marginBottomMm: (v) => num(v, 0, 100, 20),
  marginLeftMm: (v) => num(v, 0, 100, 20),

  showHeader: (v) => Boolean(v),
  headerContent: (v) => str(v, 20000),
  headerText: (v) => str(v, 500),
  headerAlign: (v) => oneOf(ALIGNS, v, "left"),
  headerHeightMm: (v) => num(v, 4, 60, 12),
  headerStartPage: (v) => num(v, 1, 999, 1),

  showFooter: (v) => Boolean(v),
  footerContent: (v) => str(v, 20000),
  footerText: (v) => str(v, 500),
  footerAlign: (v) => oneOf(ALIGNS, v, "center"),
  footerHeightMm: (v) => num(v, 4, 60, 12),
  footerStartPage: (v) => num(v, 1, 999, 1),

  pageNumberPosition: (v) => oneOf(NUMBER_POSITIONS, v, "none"),

  fontFamily: (v) => str(v, 80),
  fontCategory: (v) => str(v, 40),
  fontSizePt: (v) => num(v, 6, 96, 11),

  // RTL IS A DOCUMENT PROPERTY, not a studio one. A company writes its quality
  // manual in Arabic and its supplier agreements in English, and the editor has
  // to lay each one out the way it is read.
  language: (v) => oneOf(["en", "ar"], v, "en"),
};

const cleanSetup = (body: Record<string, unknown> | null | undefined) => {
  const out: Record<string, unknown> = {};
  for (const [field, clean] of Object.entries(SETUP_FIELDS)) {
    if (body?.[field] !== undefined) out[field] = clean(body[field]);
  }
  return out;
};

// ---- reading -----------------------------------------------------------------

const withState = (doc: QualityDocument, revisions: QualityRevision[]) => ({
  ...doc,
  // DERIVED, never stored. A status field and a revision list disagree the
  // first time one of them is written without the other.
  state: documentState(doc, revisions),
  pending: pendingRevision(doc, revisions),
});

// `ctx` IS a scope — it already carries `studio` and `section` — so these read
// exactly what the hand-written calls read, with one fewer thing to get wrong.
const Docs = repo<QualityDocument>(DOCS);
const Revisions = repo<QualityRevision>(REVISIONS);

export async function listDocs(ctx: QualityContext) {
  const [docs, revisions] = await Promise.all([
    Docs.find(ctx),
    Revisions.find(ctx),
  ]);
  return docs
    .map((d) => withState(d, revisions))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

export async function getDoc(ctx: QualityContext, id: string) {
  const [docs, revisions] = await Promise.all([
    Docs.find(ctx),
    Revisions.find(ctx),
  ]);
  const doc = docs.find((d) => d.id === id);
  if (!doc) return { error: "notfound" };

  const mine = revisions.filter((r) => r.documentId === id);
  const open = mine.find((r) => isOpen(r.state)) || null;
  const effective = mine.find((r) => r.state === "effective") || null;

  // WHAT AN ISSUED DOCUMENT *IS*, as opposed to what is being written next.
  // With nothing in flight the screen shows the issued revision and refuses to
  // edit it; with a revision open it shows the working copy, which is that
  // revision's draft.
  return {
    document: withState(doc, revisions),
    issued: !open && effective ? effective : null,
    canEdit: Boolean(open) || !effective,
  };
}

// ---- writing -----------------------------------------------------------------

/**
 * WHETHER THE WORKING COPY MAY BE TOUCHED AT ALL.
 *
 * A document that has been issued is what people are working to, and the
 * working copy is what prints. So once a revision is effective the copy freezes
 * until somebody explicitly starts the next revision — otherwise a keystroke
 * changes the procedure a company is being audited against, with no record that
 * anything happened.
 *
 * A document nobody has issued yet is simply a draft, and drafts are for
 * writing in.
 */
async function editable(ctx: QualityContext, documentId: string) {
  const revisions = (await Revisions.find(ctx))
    .filter((r) => r.documentId === documentId);
  if (revisions.some((r) => isOpen(r.state))) return null;
  if (revisions.some((r) => r.state === "effective")) return { error: "issued" };
  return null;
}

// The number is minted inside one Lua call, so two people creating a document
// in the same second get two different codes rather than both reading the same
// tally. It never goes backwards either, which is what keeps a deleted draft's
// number spent — a reused document code is indistinguishable from a forged one.
async function mintCode(
  ctx: QualityContext,
  { prefix, dept, docs }: { prefix: string; dept: string; docs: QualityDocument[] },
) {
  const key = `${SEC.prefix(ctx.studio.id, ctx.section.id)}seq`;
  const seq = await bumpCounter(key, `${prefix}-${dept}`, highestSeq(docs, prefix, dept));
  return formatCode(prefix, dept, seq);
}

export async function createDoc(ctx: QualityContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "quality.documents.create");
  if (denied) return denied;

  const title = str(body?.title, MAX_TITLE) || "Untitled document";
  const prefix = str(body?.prefix, 8).toUpperCase() || "DOC";
  const dept = str(body?.dept, 8).toUpperCase() || "GEN";

  const docs = await Docs.find(ctx);
  const code = await mintCode(ctx, { prefix, dept, docs });
  const now = new Date().toISOString();

  const row = await Docs.create(ctx, {
    id: randomUUID(),
    code,
    title,
    typeId: str(body?.typeId, 64),
    dept,
    prefix,
    // Absent rather than empty: the editor seeds a blank document itself, and
    // an empty string would be parsed as invalid JSON on the way back.
    content: "",
    ...cleanSetup({ pageSize: "a4", marginPreset: "normal", fontFamily: "Inter", fontCategory: "sans-serif", fontSizePt: 11, language: "en" }),
    createdAt: now,
    updatedAt: now,
    createdBy: ctx.collaborator?.id || "",
    createdByAlias: ctx.collaborator?.alias || "",
  });
  return { document: withState(row, []) };
}

export async function renameDoc(ctx: QualityContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;
  const title = str(body?.title, MAX_TITLE) || "Untitled document";
  const row = await Docs.update(ctx, id, {
    title, updatedAt: new Date().toISOString(),
  });
  return row ? { document: row } : { error: "notfound" };
}

/**
 * The hot path. Called on a debounce while somebody types, so it patches and
 * returns without reading anything it does not need.
 */
export async function saveContent(ctx: QualityContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const frozen = await editable(ctx, id);
  if (frozen) return frozen;

  const content = String(body?.content ?? "");
  // A body is stringified ProseMirror JSON. Parsed once here purely to refuse
  // something that is not a document at all — a store that accepts arbitrary
  // strings hands the editor a crash the next time it opens the row.
  try {
    const parsed = JSON.parse(content);
    if (!parsed || parsed.type !== "doc") return { error: "content" };
  } catch {
    return { error: "content" };
  }
  if (content.length > 2_000_000) return { error: "too-large" };

  const row = await Docs.update(ctx, id, {
    content, updatedAt: new Date().toISOString(),
  });
  return row ? { ok: true } : { error: "notfound" };
}

export async function savePageSetup(ctx: QualityContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "quality.documents.edit");
  if (denied) return denied;

  const frozen = await editable(ctx, id);
  if (frozen) return frozen;

  const patch = cleanSetup(body);
  if (!Object.keys(patch).length) return { error: "empty" };

  const row = await Docs.update(ctx, id, {
    ...patch, updatedAt: new Date().toISOString(),
  });
  return row ? { document: row } : { error: "notfound" };
}

export async function removeDoc(ctx: QualityContext, id: string) {
  const denied = requirePermission(ctx.access, "quality.documents.delete");
  if (denied) return denied;

  const revisions = await Revisions.find(ctx);
  const mine = revisions.filter((r) => r.documentId === id);
  const doc = await Docs.byId(ctx, id);
  if (!doc) return { error: "notfound" };

  // AN ISSUED DOCUMENT IS NOT DELETABLE. Somebody is working from it, and the
  // record of what they were told to do outlives whoever wants it gone.
  if (documentState(doc, revisions) === "effective") return { error: "controlled" };

  await Promise.all(mine.map((r) => Revisions.remove(ctx, r.id)));
  const gone = await Docs.remove(ctx, id);
  return gone ? { ok: true } : { error: "notfound" };
}
