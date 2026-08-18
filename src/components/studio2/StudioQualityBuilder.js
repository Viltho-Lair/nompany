"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Icon } from "@/components/studio2/icons";
import { MergeField } from "@/components/studio2/qualityMergeField";
import { btn, btnGhost, input, microLabel } from "@/components/studio2/ui";
import { blankSection, MAX_SECTIONS, emptyDoc } from "@/lib/qualityContent";
import { SCREEN_CSS } from "@/lib/qualityCss";
import QualityWorkflow from "@/components/studio2/QualityWorkflow";

// THE BUILDER — Quality → Documents → one document, full screen.
//
// A document is an ORDERED LIST OF SECTIONS rather than one long page. Quality
// documents are written and cited section by section ("see 4.2"), and authoring
// them that way is also what lets pagination be settled by the print engine at
// render time instead of simulated live in the editor — which is the expensive,
// fragile half of every WYSIWYG document tool.
//
// Nothing here ever sends HTML. Each section's body is ProseMirror JSON, the
// same shape the server validates against its allowlist and the renderer draws
// from. See lib/qualityContent.js for why that is the whole security model.

const AUTOSAVE_MS = 1500;
const HEARTBEAT_MS = 60000;

// The toolbar acts on whichever section has the caret, so the buttons are drawn
// once at the top rather than repeated above every section.
function Toolbar({ editor, onInsertField, disabled }) {
  if (!editor) {
    return <div className="h-[46px] border-b border-slate-200/70 dark:border-white/10" />;
  }
  const item = (labelText, isActive, run, title) => (
    <button
      key={labelText}
      type="button"
      title={title || labelText}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); run(); }}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-700 transition-colors disabled:opacity-40 ${isActive
        ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}
    >
      {labelText}
    </button>
  );
  const chain = () => editor.chain().focus();

  return (
    <div className="sticky top-[73px] z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200/70 bg-[var(--geex-page)] px-2 py-2 dark:border-white/10">
      {item("B", editor.isActive("bold"), () => chain().toggleBold().run(), "Bold")}
      {item("I", editor.isActive("italic"), () => chain().toggleItalic().run(), "Italic")}
      {item("U", editor.isActive("underline"), () => chain().toggleUnderline().run(), "Underline")}
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
      {item("H1", editor.isActive("heading", { level: 1 }), () => chain().toggleHeading({ level: 1 }).run())}
      {item("H2", editor.isActive("heading", { level: 2 }), () => chain().toggleHeading({ level: 2 }).run())}
      {item("H3", editor.isActive("heading", { level: 3 }), () => chain().toggleHeading({ level: 3 }).run())}
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
      {item("• List", editor.isActive("bulletList"), () => chain().toggleBulletList().run(), "Bulleted list")}
      {item("1. List", editor.isActive("orderedList"), () => chain().toggleOrderedList().run(), "Numbered list")}
      {item("❝", editor.isActive("blockquote"), () => chain().toggleBlockquote().run(), "Quote")}
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
      {item("Table", false, () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), "Insert a table")}
      {item("—", false, () => chain().setHorizontalRule().run(), "Horizontal rule")}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); onInsertField(); }}
        className="ms-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-700 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        Insert field
      </button>
    </div>
  );
}

// One section's body. Each owns its own editor instance, which is what keeps a
// caret, an undo history and a selection belonging to the section they were
// made in rather than leaking across a document.
function SectionEditor({ section, values, labels, editable, onChange, onFocus }) {
  const editor = useEditor({
    // Next renders this on the server first; TipTap must not try to.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      MergeField.configure({ values, labels }),
    ],
    content: section.body || emptyDoc(),
    editorProps: {
      attributes: {
        class: "quality-prose focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()),
    onFocus: () => onFocus(editor),
  }, [section.id, editable]);

  // The toolbar needs the instance the moment it exists, not only once somebody
  // has clicked into it — otherwise the first section reads as disabled.
  useEffect(() => { if (editor) onFocus(editor, { silent: true }); }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  return <EditorContent editor={editor} />;
}

export default function StudioQualityBuilder({ studio, documentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [sections, setSections] = useState([]);
  const [activeEditor, setActiveEditor] = useState(null);
  const [saveState, setSaveState] = useState("saved");   // saved | saving | dirty | error
  const [lock, setLock] = useState(null);
  const [fieldMenu, setFieldMenu] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  const timer = useRef(null);
  const latest = useRef([]);
  latest.current = sections;

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/quality/content?id=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 404 ? "That document doesn't exist." : "You don't have access to this document.");
      return;
    }
    const payload = await res.json();
    setData(payload);
    setSections(payload.sections || []);
    setLock(payload.lock);
    setSavedAt(payload.revision?.updatedAt || "");
    setError("");
  }, [studio.slug, documentId]);

  useEffect(() => { load(); }, [load]);

  const post = useCallback(async (action) => {
    const res = await fetch(`/api/studios/${studio.slug}/quality/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: documentId, action }),
    });
    const payload = await res.json().catch(() => ({}));
    setLock(payload.lock || null);
    return { ok: res.ok, payload };
  }, [studio.slug, documentId]);

  // TAKE THE DOCUMENT ON ARRIVAL, if we may edit it at all. A reader never
  // claims it — opening a document to read must not stop somebody else writing.
  useEffect(() => {
    if (!data?.canEdit) return undefined;
    post("acquire");
    const beat = setInterval(() => post("acquire"), HEARTBEAT_MS);
    // Letting go on the way out is a courtesy, not the mechanism: the lock has a
    // TTL, so a browser that closes without getting here frees it anyway.
    const drop = () => navigator.sendBeacon?.(
      `/api/studios/${studio.slug}/quality/content`,
      new Blob([JSON.stringify({ id: documentId, action: "release" })], { type: "application/json" }),
    );
    window.addEventListener("pagehide", drop);
    return () => { clearInterval(beat); window.removeEventListener("pagehide", drop); drop(); };
  }, [data?.canEdit, post, studio.slug, documentId]);

  const mine = Boolean(lock?.mine);
  // A REVISION THAT HAS BEEN SENT FOR REVIEW IS FROZEN. The whole value of a
  // signature is that it was given against particular words, so the text stops
  // moving the moment it is somebody else's turn to read it — the server refuses
  // the write anyway, and an editor that still accepts keystrokes it is about to
  // lose is a worse way to find that out.
  const revState = data?.revision?.state || "draft";
  const writable = ["draft", "rejected"].includes(revState);
  const editable = Boolean(data?.canEdit && mine && writable);

  const save = useCallback(async () => {
    setSaveState("saving");
    const res = await fetch(`/api/studios/${studio.slug}/quality/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: documentId, sections: latest.current }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaveState("error");
      if (payload.error === "locked") setLock(payload.lock || null);
      return;
    }
    setSaveState("saved");
    setSavedAt(payload.updatedAt || "");
  }, [studio.slug, documentId]);

  // Autosave rather than a Save button: a document builder that can lose an
  // afternoon because somebody closed a tab is not one people will trust.
  const touch = useCallback(() => {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_MS);
  }, [save]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setBody = (id, body) => {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, body } : s)));
    touch();
  };
  const setTitle = (id, title) => {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, title } : s)));
    touch();
  };
  const addSection = () => {
    if (sections.length >= MAX_SECTIONS) return;
    setSections((list) => [...list, blankSection("")]);
    touch();
  };
  const removeSection = (id) => {
    setSections((list) => (list.length <= 1 ? list : list.filter((s) => s.id !== id)));
    touch();
  };
  const move = (id, delta) => {
    setSections((list) => {
      const i = list.findIndex((s) => s.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    touch();
  };

  const labels = useMemo(
    () => Object.fromEntries((data?.mergeFields || []).map((f) => [f.key, f.label])),
    [data?.mergeFields],
  );
  const grouped = useMemo(() => {
    const out = new Map();
    for (const f of data?.mergeFields || []) {
      if (!out.has(f.group)) out.set(f.group, []);
      out.get(f.group).push(f);
    }
    return [...out.entries()];
  }, [data?.mergeFields]);

  const doc = data?.document;
  const saveLabel = { saved: savedAt ? "All changes saved" : "Nothing written yet", saving: "Saving…", dirty: "Unsaved changes", error: "Couldn't save" }[saveState];

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      {/* The document's appearance, from the same string that paints the PDF.
          It lives in a module rather than the global stylesheet precisely so
          there is only ever one of it — see lib/qualityCss.js. */}
      <style>{SCREEN_CSS}</style>

      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/quality-documents`}
            title="Back to the register"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white sm:text-xl">
              {doc ? <><span className="font-mono text-brand-700 dark:text-brand-300">{doc.code}</span> · {doc.title}</> : "Loading…"}
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {doc && `${doc.typeName} · ${doc.departmentName} · Rev ${data.revision?.rev ?? "—"} draft`}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-3">
            <span className={`text-xs font-600 ${saveState === "error" ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
              {editable ? saveLabel : ""}
            </span>
            <Link href={`/${studio.slug}/quality-documents/${documentId}/preview`} className={btnGhost}>
              Preview &amp; export
            </Link>
          </div>
        </div>

        {/* WHO HOLDS THE DOCUMENT, said plainly. A read-only editor with no
            explanation is indistinguishable from a broken one. */}
        {data && data.canEdit && !mine && lock?.holder && (
          <div className="flex flex-wrap items-center gap-3 border-t border-amber-200 bg-amber-50 px-5 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 sm:px-8">
            <span><span className="font-700">{lock.holderAlias}</span> is editing this draft. You can read it, but not change it.</span>
            <button type="button" className="ms-auto rounded-full border border-amber-300 px-3 py-1 text-xs font-600 hover:bg-amber-100 dark:border-amber-500/30 dark:hover:bg-amber-500/10"
              onClick={async () => { const r = await post("take-over"); if (r.ok) load(); }}>
              Take over
            </button>
          </div>
        )}
        {data && data.canEdit && mine && !writable && (
          <div className="border-t border-brand-200 bg-brand-500/10 px-5 py-2.5 text-sm text-brand-800 dark:border-brand-500/20 dark:text-brand-300 sm:px-8">
            This revision has been sent on and is now read-only. Signatures are given against particular words, so the
            text stops moving once somebody is reading it.
          </div>
        )}
        {data && !data.canEdit && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:px-8">
            You can read this document but not change it.
          </div>
        )}
      </header>

      {error && (
        <main className="mx-auto max-w-[900px] px-5 py-10 sm:px-8">
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
        </main>
      )}

      {data && !error && (
        <div className="mx-auto flex max-w-[1500px] gap-6 px-5 py-6 sm:px-8">
          {/* Left rail — the outline. A controlled document is cited by section
              number, so the numbering is shown rather than left to be counted. */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <p className={microLabel}>Sections</p>
            <ol className="mt-2 space-y-1">
              {sections.map((s, i) => (
                <li key={s.id} className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/5">
                  <a href={`#section-${s.id}`} className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
                    <span className="font-mono text-xs text-slate-400">{i + 1}.</span>{" "}
                    {s.title || <span className="italic text-slate-400">Untitled</span>}
                  </a>
                  {editable && (
                    <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                      <button type="button" onClick={() => move(s.id, -1)} title="Move up"
                        className="rounded p-0.5 text-slate-400 hover:text-brand-600">
                        <Icon name="chevronUp" className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => move(s.id, 1)} title="Move down"
                        className="rounded p-0.5 text-slate-400 hover:text-brand-600">
                        <Icon name="chevronDown" className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {editable && sections.length < MAX_SECTIONS && (
              <button type="button" onClick={addSection}
                className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-600 text-slate-500 hover:border-brand-500 hover:text-brand-700 dark:border-white/15 dark:text-slate-400">
                + Add a section
              </button>
            )}
          </aside>

          {/* Centre — the paper. It stays white in dark mode on purpose: the
              document is a physical artefact, and a dark-mode letterhead would
              be a lie about what prints. */}
          <main className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10">
              {editable && <Toolbar editor={activeEditor} onInsertField={() => setFieldMenu((v) => !v)} disabled={!editable} />}

              {fieldMenu && editable && (
                <div className="border-b border-slate-200/70 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500">Insert a field</p>
                  <div className="flex flex-wrap gap-4">
                    {grouped.map(([group, fields]) => (
                      <div key={group}>
                        <p className="mb-1 text-[11px] font-700 text-slate-400">{group}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fields.map((f) => (
                            <button key={f.key} type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                activeEditor?.chain().focus().insertMergeField(f.key).run();
                                setFieldMenu(false);
                              }}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-600 text-slate-600 hover:border-brand-500 hover:text-brand-700">
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="quality-page mx-auto bg-white px-[18mm] py-[16mm] text-slate-900">
                {sections.map((s, i) => (
                  <section key={s.id} id={`section-${s.id}`} className="mb-8 last:mb-0"
                    dir={doc?.language === "ar" ? "rtl" : "ltr"}>
                    <div className="mb-2 flex items-baseline gap-2">
                      <span className="font-mono text-sm font-700 text-slate-400">{i + 1}.</span>
                      <input
                        value={s.title}
                        readOnly={!editable}
                        placeholder="Section title"
                        onChange={(e) => setTitle(s.id, e.target.value)}
                        className="w-full border-0 bg-transparent p-0 font-display text-lg font-800 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0"
                      />
                      {editable && sections.length > 1 && (
                        <button type="button" onClick={() => removeSection(s.id)} title="Remove this section"
                          className="shrink-0 text-xs font-600 text-slate-300 hover:text-rose-600">✕</button>
                      )}
                    </div>
                    <SectionEditor
                      section={s}
                      values={data.mergeValues}
                      labels={labels}
                      editable={editable}
                      onChange={(body) => setBody(s.id, body)}
                      onFocus={(ed, opts) => { if (!opts?.silent || !activeEditor) setActiveEditor(ed); }}
                    />
                  </section>
                ))}
              </div>
            </div>
          </main>

          {/* Right — the document's own facts, and the control panel that moves
              it along. */}
          <aside className="hidden w-80 shrink-0 space-y-4 xl:block">
            <p className={microLabel}>This document</p>
            <dl className="mt-2 space-y-2.5 rounded-geex border border-slate-200/70 bg-white p-4 text-sm dark:border-white/10 dark:bg-[#20202c]">
              {[
                ["Code", <span key="c" className="font-mono font-700">{doc?.code}</span>],
                ["Type", doc?.typeName || "—"],
                ["Department", doc?.departmentName || "—"],
                ["Owner", doc?.ownerAlias || "—"],
                ["Revision", `${data.revision?.rev ?? "—"} (draft)`],
                ["Next review", doc?.nextReviewDate || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{k}</dt>
                  <dd className="min-w-0 truncate text-end text-slate-700 dark:text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Page breaks are decided when the document is rendered, so what you write here flows into pages at export
              rather than being fitted to them as you type.
            </p>

            <QualityWorkflow slug={studio.slug} documentId={documentId} document={doc} onChanged={load} />
          </aside>
        </div>
      )}
    </div>
  );
}
