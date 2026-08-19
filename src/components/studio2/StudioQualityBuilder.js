"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Icon } from "@/components/studio2/icons";
import { MergeField } from "@/components/studio2/qualityMergeField";
import { PageBreak } from "@/components/studio2/qualityPageBreak";
import { RecordBlock, InputField } from "@/components/studio2/qualitySlots";
import { btn, btnGhost, input, microLabel } from "@/components/studio2/ui";
import { blankSection, MAX_SECTIONS, emptyDoc } from "@/lib/qualityContent";
import { SCREEN_CSS } from "@/lib/qualityCss";
import QualityWorkflow from "@/components/studio2/QualityWorkflow";
import QualityDistribution from "@/components/studio2/QualityDistribution";

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
function Toolbar({ editor, onInsertField, onInsertBlock, onInsertInput, disabled, hasBlocks }) {
  // A placeholder of the same height while the first editor mounts, so the page
  // does not jump under the cursor a beat after it is drawn.
  if (!editor) return <div className="h-[45px] border-t border-[var(--geex-border)]" />;
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
    <div className="flex flex-wrap items-center gap-0.5 border-t border-[var(--geex-border)] px-5 py-2 sm:px-8">
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
      {item("Page break", false, () => chain().setPageBreak().run(), "Start a new page here (Ctrl+Enter)")}
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); onInsertField(); }}
        className="ms-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-700 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        Insert field
      </button>
      {/* Offered only where a block could resolve — with no record bound there
          is nothing for one to read, and a button that inserts a permanent
          "nothing bound" marker is a button that makes documents worse. */}
      {hasBlocks && (
        <button type="button" disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); onInsertBlock(); }}
          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-700 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
          Insert block
        </button>
      )}
      <button type="button" disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); onInsertInput(); }}
        className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-700 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
        Insert answer
      </button>

      {/* THE TABLE CONTROLS, only where they apply. Drawn always, they would be
          nine buttons that do nothing unless the caret happens to be in a table
          — which is how a toolbar teaches people to stop reading it. */}
      {editor.isActive("table") && (
        <span className="ms-2 flex flex-wrap items-center gap-0.5 rounded-lg bg-brand-500/10 px-1.5 py-0.5">
          <span className="pe-1 text-[10px] font-700 uppercase tracking-wide text-brand-700 dark:text-brand-300">Table</span>
          {item("+Row", false, () => chain().addRowAfter().run(), "Add a row below")}
          {item("−Row", false, () => chain().deleteRow().run(), "Delete this row")}
          {item("+Col", false, () => chain().addColumnAfter().run(), "Add a column after")}
          {item("−Col", false, () => chain().deleteColumn().run(), "Delete this column")}
          {item("Header", editor.isActive("tableHeader"), () => chain().toggleHeaderRow().run(), "Toggle the header row")}
          {item("Merge", false, () => chain().mergeOrSplit().run(), "Merge the selected cells, or split a merged one")}
          {item("Remove", false, () => chain().deleteTable().run(), "Delete the whole table")}
        </span>
      )}
    </div>
  );
}

// One section's body. Each owns its own editor instance, which is what keeps a
// caret, an undo history and a selection belonging to the section they were
// made in rather than leaking across a document.
function SectionEditor({ section, values, labels, sources, editable, onChange, onFocus }) {
  const editor = useEditor({
    // Next renders this on the server first; TipTap must not try to.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      MergeField.configure({ values, labels }),
      PageBreak,
      RecordBlock.configure({ sources }),
      InputField,
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

// WHAT THIS DOCUMENT IS ABOUT.
//
// Optional, and most documents are about nothing in particular — a purchasing
// procedure is not about one ticket. Binding is what makes a DEPARTMENT'S fields
// reachable: with no subject the Insert field menu offers Company, Document and
// the studio's legal information; bind a sales ticket and Sales appears with its
// client, contact and site.
//
// The picker's contents are fetched only when it is opened, because a list of
// every sales ticket is Sales data and should not ride along on every document.
function SubjectBinding({ slug, documentId, data, editable, onChanged }) {
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const type = data?.subject?.type || "";

  useEffect(() => {
    if (!type) { setOptions(null); return; }
    let alive = true;
    fetch(`/api/studios/${slug}/quality/subjects?subject=${encodeURIComponent(type)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { options: [] }))
      .then((p) => { if (alive) setOptions(p.options || []); })
      .catch(() => { if (alive) setOptions([]); });
    return () => { alive = false; };
  }, [slug, type]);

  const bind = async (patch) => {
    setBusy(true);
    try {
      await fetch(`/api/studios/${slug}/quality/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, subjectType: "", subjectId: "", ...patch }),
      });
      onChanged?.();
    } finally { setBusy(false); }
  };

  const chosen = (options || []).find((o) => o.id === data?.subject?.id);
  const isTemplate = Boolean(data?.isTemplate);

  const setTemplate = async (on) => {
    setBusy(true);
    try {
      await fetch(`/api/studios/${slug}/quality/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, isTemplate: on }),
      });
      onChanged?.();
    } finally { setBusy(false); }
  };

  return (
    <div>
      <p className={microLabel}>{isTemplate ? "Requested from" : "About"}</p>
      <div className="mt-2 space-y-2 rounded-geex border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-[#20202c]">
        {/* A TEMPLATE IS STILL A CONTROLLED DOCUMENT. The flag says only that
            this one is a blank to be filled rather than a procedure to be
            followed — the distinction the starter pack's Form and Record types
            have named since the module's first day. */}
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={isTemplate}
            disabled={!editable || busy} onChange={(e) => setTemplate(e.target.checked)} />
          <span>
            This is a template
            <span className="block text-xs text-slate-400 dark:text-slate-500">
              A blank other departments fill in, rather than a procedure people follow.
            </span>
          </span>
        </label>

        {isTemplate ? (
          <>
            {/* WHERE IT IS ASKED FOR IS ROUTING, NOT CONTENT, so it is set in
                setup and only shown here. Binding it there also settles what
                the template is about: a button in the quotation viewer hands
                over a quotation. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-[#191921]">
              {data?.callPoint ? (
                <>
                  <p className="font-600 text-slate-800 dark:text-slate-200">{data.callPoint.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{data.callPoint.where}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Not requested from anywhere yet. Choose a button in Setup → Requested from.
                </p>
              )}
            </div>
            <Link href={`/${slug}/quality-documents/settings`} className="block text-xs font-600 text-brand-700 hover:text-brand-950 dark:text-brand-300">
              Change in setup
            </Link>
          </>
        ) : (
          <select
            className={input}
            value={type}
            disabled={!editable || busy}
            onChange={(e) => bind({ subjectType: e.target.value, subjectId: "" })}
          >
            <option value="">Nothing in particular</option>
            {(data?.subjects || []).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        )}

        {type && (
          <select
            className={input}
            value={data?.subject?.id || ""}
            disabled={!editable || busy || options === null}
            onChange={(e) => bind({ subjectType: type, subjectId: e.target.value })}
          >
            <option value="">{options === null ? "Loading…" : "Choose one…"}</option>
            {(options || []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500">
          {isTemplate
            ? "Pick a record above to preview this template filled in. The real one arrives when somebody presses the button."
            : type && chosen
              ? "That department's fields are now available under Insert field."
              : "Bind a record to reach its department's fields. Company and Document fields work either way."}
        </p>
      </div>
    </div>
  );
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
  // GROUPED BY THE SERVER, which is the only side that knows what this author
  // holds and what the document is bound to. Regrouping here would be a second
  // copy of a rule that has a permission check inside it.
  const grouped = data?.mergeGroups || [];

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
        {/* The toolbar and the field menu, as part of the studio's chrome rather
            than of the document. They theme with the studio; the sheet below
            stays white in both themes because it is a physical artefact. */}
        {data && !error && editable && (
          <>
            <Toolbar
              editor={activeEditor}
              disabled={!editable}
              hasBlocks={(data.blockSources || []).length > 0}
              onInsertField={() => setFieldMenu((v) => !v)}
              onInsertBlock={() => {
                const source = (data.blockSources || [])[0];
                if (source) activeEditor?.chain().focus().insertRecordBlock(source.key).run();
              }}
              onInsertInput={() => {
                const label = window.prompt("What should this answer be labelled?", "Trainee name");
                if (!label) return;
                const name = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
                activeEditor?.chain().focus().insertInputField({ name, label, inputType: "text" }).run();
              }}
            />
            {fieldMenu && (
              <div className="border-t border-[var(--geex-border)] bg-[var(--geex-surface-2)] px-5 py-4 sm:px-8">
                <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Insert a field</p>
                <div className="flex flex-wrap gap-4">
                  {grouped.map(([group, fields]) => (
                    <div key={group}>
                      <p className="mb-1 text-[11px] font-700 text-slate-400 dark:text-slate-500">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {fields.map((f) => (
                          <button key={f.key} type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              activeEditor?.chain().focus().insertMergeField(f.key).run();
                              setFieldMenu(false);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-600 text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
            {/* THE CARD HOLDS THE PAPER AND NOTHING ELSE. The toolbar used to
                live in here, stickied inside a card that was itself inside a
                sticky header — so it detached as the page scrolled, left a white
                band where it had been, and printed itself over the first
                section. It is chrome, so it belongs in the chrome. */}
            <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10">
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
                      sources={data.blockSources || []}
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

            <SubjectBinding slug={studio.slug} documentId={documentId} data={data} editable={Boolean(data.canEdit)} onChanged={load} />

            <QualityWorkflow slug={studio.slug} documentId={documentId} document={doc} onChanged={load} />
            <QualityDistribution slug={studio.slug} documentId={documentId} document={doc} />
          </aside>
        </div>
      )}
    </div>
  );
}
