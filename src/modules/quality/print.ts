// PRINTING A CUSTOMER DOCUMENT — a quotation or an invoice, through the layout
// the studio chose for that type in that language, filled from the record.
//
// THREE RULES, each the owner's or a consequence of one:
//
//   ONLY A PUBLISHED LAYOUT PRINTS. "Approval needed of course" — the layout a
//   client receives is the layout's EFFECTIVE revision, its frozen snapshot,
//   never the working copy somebody is editing this afternoon.
//
//   THE LANGUAGE IS CHOSEN PER DOCUMENT, so a studio keeps one layout per type
//   per language and the reader picks which to print.
//
//   PRINTING RIDES THE RECORD'S RIGHT, not the document register's. Somebody in
//   Finance prints an invoice without being able to open Engineering &
//   Documents, so this does not go through `qualityContext` (whose view guard
//   would refuse them); it builds the same shape from the studio context, and
//   the record's own permission is asked before anything is read — and again,
//   hop by hop, by the resolver.

import { can, requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { Section } from "@/platform/db/sections";
import { updateStudio } from "@/modules/main/studios";
import { documentsDict } from "@/shared/studio/documents";
import { DOCS, REVISIONS, createDoc, saveContent, savePageSetup } from "./qualityDocs";
import { SETUP_SNAPSHOT } from "./qualityDocRevisions";
import { mergeValuesFor, resolveBlocks, bindSubject } from "./quality";
import { subjectById } from "./qualityFields";
import { fillTemplate } from "./fill";
import {
  isDocumentKind, isLayoutLanguage, layoutIdFor, recordWatermark, starterLayout, withLayout,
  type LayoutLanguage,
} from "./layouts";
import type { QualityContext, QualityDocument, QualityRevision } from "./types";

const Docs = repo<QualityDocument>(DOCS);
const Revisions = repo<QualityRevision>(REVISIONS);

const REGISTER = "engineering-docs-register";
const layoutsOf = (ctx: QualityContext) => (ctx.studio as { documentLayouts?: unknown }).documentLayouts;

/**
 * The resolver's context, built from the plain studio context a print route
 * receives. Null when the studio has no document register at all — then it has
 * no layouts either, and the answer is "no layout" rather than an error.
 */
export function printContextFrom(args: {
  studio: unknown; collaborator: unknown; access: unknown; sections: unknown;
}): QualityContext | null {
  const sections = (Array.isArray(args.sections) ? args.sections : []) as Section[];
  const section = sections.find((s) => s.key === REGISTER);
  if (!section) return null;
  return {
    studio: args.studio,
    collaborator: args.collaborator,
    access: args.access,
    roles: [],
    sections,
    section,
    masterSection: sections.find((s) => s.key === "administration-master") || null,
    // Printing writes nothing, so it manages nothing.
    canManage: false,
    canViewDashboard: false,
    nav: null,
    manage: null,
  } as unknown as QualityContext;
}

export async function printDocument(
  ctx: QualityContext,
  query: { kind?: unknown; id?: unknown; language?: unknown },
) {
  const { kind, language } = query;
  const id = String(query.id ?? "").trim().slice(0, 60);
  if (!isDocumentKind(kind)) return { error: "kind" };
  if (!isLayoutLanguage(language)) return { error: "language" };
  if (!id) return { error: "missing" };

  // THE RECORD'S RIGHT FIRST — before a layout is read, so a refusal says what
  // was refused rather than "no layout" to somebody who could never print one.
  const subject = subjectById(kind);
  if (!subject || !can(ctx.access, subject.permission as PermissionKey)) return { error: "forbidden" };

  const templateId = layoutIdFor(layoutsOf(ctx), kind, language);
  if (!templateId) return { state: "no-layout", kind, language };

  const [docs, revisions] = await Promise.all([Docs.find(ctx), Revisions.find(ctx)]);
  const template = docs.find((d) => d.id === templateId);
  const issued = revisions.find((r) => r.documentId === templateId && r.state === "effective");
  // Chosen once and since withdrawn, deleted, or superseded with nothing
  // effective: the slot names a layout nothing can print from.
  if (!template || !issued) return { state: "not-issued", kind, language, templateId: template ? templateId : "" };

  // The template is bound to the TYPE; the record is supplied here, for this
  // render only — exactly the use `subjectId` was always documented for.
  const bound = { ...template, subjectType: kind, subjectId: id } as QualityDocument;
  const [values, blocks] = await Promise.all([
    mergeValuesFor(ctx, bound, { rev: Number(issued.rev) || null }),
    resolveBlocks(ctx, bound),
  ]);
  // A found record always yields its status (present, perhaps empty); a record
  // that is gone yields nothing at all.
  const statusKey = `${kind}.status`;
  if (!(statusKey in values)) return { error: "notfound" };

  const tr = documentsDict(language);
  const words = { columns: tr.columns, totals: tr.totals, vatAt: tr.vatAt, rtl: language === "ar" };
  const currency = values[`${kind}.currency`] || "";
  const missing = new Set<string>();
  const fill = (raw: unknown) => {
    const s = String(raw || "");
    if (!s) return "";
    try {
      const out = fillTemplate(JSON.parse(s), values, blocks, words, currency);
      out.missing.forEach((m) => missing.add(m));
      return JSON.stringify(out.doc);
    } catch {
      return s; // a legacy plain-text band holds no placeholder
    }
  };

  const document: Record<string, unknown> = { id: templateId, title: template.title || "" };
  for (const field of SETUP_SNAPSHOT) {
    if (issued[field] !== undefined) document[field] = issued[field];
  }
  document.content = fill(issued.content);
  document.headerContent = fill(issued.headerContent);
  document.footerContent = fill(issued.footerContent);

  return {
    state: "ready",
    kind,
    language,
    templateId,
    reference: values[kind === "invoice" ? "invoice.reference" : "quotation.number"] || "",
    watermark: recordWatermark(kind, values[statusKey]),
    missing: [...missing],
    document,
  };
}

// ---- choosing the default layout ---------------------------------------------

/**
 * WHAT THIS DOCUMENT IS AS A LAYOUT, for the workspace strip: the type it is
 * bound to, the language it PRINTS in (its published revision's, when there is
 * one — that is what a client would receive), whether it is published, whether
 * it is the studio's choice, and whether this reader may make it so.
 */
export async function layoutStateFor(
  ctx: QualityContext,
  document: { id: string; subjectType?: unknown; language?: unknown },
) {
  const kind = document.subjectType;
  if (!isDocumentKind(kind)) return null;
  const revisions = await Revisions.find(ctx);
  const effective = revisions.find((r) => r.documentId === document.id && r.state === "effective");
  const language: LayoutLanguage = isLayoutLanguage(effective?.language)
    ? effective.language
    : isLayoutLanguage(document.language) ? document.language : "en";
  return {
    kind,
    language,
    issued: Boolean(effective),
    isDefault: layoutIdFor(layoutsOf(ctx), kind, language) === document.id,
    // THE COMPANY'S DECISION, so it answers to Studio settings' right rather
    // than the register's: the person who writes a layout is not necessarily
    // the person who decides what every client receives.
    canSet: can(ctx.access, "administration.settings.edit" as PermissionKey),
  };
}

export async function setDefaultLayout(ctx: QualityContext, documentId: string, on: boolean) {
  const denied = requirePermission(ctx.access, "administration.settings.edit" as PermissionKey);
  if (denied) return denied;

  const doc = (await Docs.find(ctx)).find((d) => d.id === documentId);
  if (!doc) return { error: "notfound" };
  const state = await layoutStateFor(ctx, doc);
  if (!state) return { error: "not-a-layout" };

  if (on && !state.issued) return { error: "not-issued" };
  if (!on && !state.isDefault) return { ok: true };

  const next = withLayout(layoutsOf(ctx), state.kind, state.language, on ? doc.id : "");
  const updated = await updateStudio(ctx.studio.id, { documentLayouts: next });
  return updated ? { ok: true } : { error: "notfound" };
}

/**
 * A STARTER LAYOUT for a type and a language — an ordinary draft, bound to its
 * type, with the letterhead carrying the studio's legal rows. It still has to be
 * published and chosen: nothing prints from a starter nobody approved.
 * Goes through the same three doors a person would, so every guard applies.
 */
export async function createStarterLayout(ctx: QualityContext, body: Record<string, unknown>) {
  const { kind, language } = body || {};
  if (!isDocumentKind(kind)) return { error: "kind" };
  if (!isLayoutLanguage(language)) return { error: "language" };

  const tr = documentsDict(language);
  const made = await createDoc(ctx, {
    title: tr.starter.layoutTitle(kind, language),
    prefix: "LAY",
    dept: kind === "invoice" ? "FIN" : "SAL",
  });
  if (!made || !("document" in made)) return made;
  const id = String(made.document.id);

  const starter = starterLayout(kind, { ...tr.starter, title: tr.kindTitle(kind) }, (ctx.studio as { legalInfo?: unknown }).legalInfo);
  const steps = [
    () => saveContent(ctx, id, { content: starter.content }),
    () => savePageSetup(ctx, id, {
      language,
      showHeader: true, headerContent: starter.header, headerHeightMm: 30,
      showFooter: true, footerContent: starter.footer,
    }),
    () => bindSubject(ctx, id, { subjectType: kind }),
  ];
  for (const step of steps) {
    const out = await step();
    if (out && typeof out === "object" && "error" in out) return out;
  }
  return { document: { id } };
}
