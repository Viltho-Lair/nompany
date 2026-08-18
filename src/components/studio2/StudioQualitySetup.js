"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import { Dialog, btn, btnGhost, input, label, panel, h2, sub } from "@/components/studio2/ui";
import { cleanCodePart } from "@/lib/qualityDocuments";

// QUALITY → DOCUMENTS → SETUP, full screen.
//
// Everything a document code is built from lives on this one screen, because
// TYPE-DEPT-NNN is a single decision that happens to have three parts. Setting
// the prefixes somewhere separate from the department codes is how a studio ends
// up with two documents that both want to be called QP-SAL-001.
//
// It is its own right (`quality.documents.setup`) rather than a bigger edit:
// this decides what every future document will be called, which is a different
// power from writing one.

const MESSAGES = {
  name: "Give the type a name.",
  prefix: "A prefix is 1–4 letters or digits, like QP.",
  "prefix-taken": "Another type already uses that prefix.",
  "prefix-in-use": "Documents have been issued under this prefix, so it can't change — their codes already carry it.",
  "in-use": "Documents are filed under this type, so it can't be deleted.",
  "not-empty": "This studio already has document types.",
  "too-many": "That's as many types as one studio can hold.",
  code: "A department code is 1–4 letters or digits.",
  "duplicate-code": "Two departments can't share a code — they would mint the same document number.",
  forbidden: "You don't have permission to do that.",
  "read-only": "You don't have permission to do that.",
};
const say = (error) => MESSAGES[error] || "That didn't work. Try again.";

const blankType = () => ({ name: "", prefix: "", description: "" });

export default function StudioQualitySetup({ studio }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [codes, setCodes] = useState({});
  const [codesDirty, setCodesDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studio.slug}/quality`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 403 ? "You don't have access to Quality documents in this studio." : "Couldn't load setup.");
      return;
    }
    const payload = await res.json();
    setData(payload);
    // Only seeded from the server while there is nothing half-typed on screen,
    // so a live update from somebody else cannot overwrite what is being edited.
    setCodes((current) => (Object.keys(current).length ? current : payload.departmentCodes || {}));
    setError("");
  }, [studio.slug]);

  useEffect(() => { load(); }, [load]);

  const send = async (method, body, path = "types") => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/studios/${studio.slug}/quality/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(say(payload.error)); return null; }
      await load();
      return payload;
    } finally {
      setBusy(false);
    }
  };

  const types = data?.types || [];
  const departments = data?.departments || [];
  const readOnly = data && !data.canSetup;

  const saveType = async () => {
    const body = draft.id
      ? { id: draft.id, name: draft.name, description: draft.description, prefix: draft.prefix }
      : { name: draft.name, prefix: draft.prefix, description: draft.description };
    const result = await send(draft.id ? "PUT" : "POST", body);
    if (result) setDraft(null);
  };

  const saveCodes = async () => {
    const result = await send("PUT", { departmentCodes: codes });
    if (result) { setCodesDirty(false); setNotice("Department codes saved."); }
  };

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/quality-documents`}
            title="Back to the register"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">Document setup</h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name} · Quality · Documents</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-5 py-6 sm:px-8">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-500">Loading…</p>}
        {notice && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{notice}</p>}

        {data && (
          <>
            {/* How a code is built, shown rather than explained. The two
                editable parts are directly below it. */}
            <div className={panel}>
              <h2 className={h2}>How documents are numbered</h2>
              <p className={sub}>
                Every document is numbered once, when it is created, and keeps that number for good — it ends up printed
                on paper and quoted in other documents, and neither of those follows a rename.
              </p>
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-white/10 dark:bg-[#191921]">
                <span className="font-700 text-brand-700 dark:text-brand-300">TYPE</span>
                <span className="text-slate-400">-</span>
                <span className="font-700 text-emerald-700 dark:text-emerald-300">DEPT</span>
                <span className="text-slate-400">-</span>
                <span className="font-700 text-slate-500 dark:text-slate-400">NNN</span>
                <span className="ms-3 font-sans text-xs text-slate-400 dark:text-slate-500">
                  e.g. {types[0]?.prefix || "QP"}-{Object.values(data.departmentCodes || {})[0] || "SAL"}-001
                </span>
              </div>
            </div>

            <div className={panel}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <h2 className={h2}>Document types</h2>
                  <p className={sub}>The kinds of document this studio controls. The prefix starts every code.</p>
                </div>
                {!readOnly && (
                  <span className="ms-auto flex gap-2">
                    {types.length === 0 && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => send("POST", { starter: true })}>
                        Install the ISO 9001 set
                      </button>
                    )}
                    <button type="button" className={btn} onClick={() => setDraft(blankType())}>Add a type</button>
                  </span>
                )}
              </div>

              {types.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  None yet. The ISO 9001 set is Policy, Procedure, Work Instruction, Form and Record — a starting point
                  you can rename, extend or delete once it's in.
                </p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {types.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#191921]">
                      <span className="inline-flex min-w-[52px] justify-center rounded-lg bg-brand-500/10 px-2 py-1 font-mono text-xs font-700 text-brand-700 dark:text-brand-300">
                        {t.prefix}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{t.name}</p>
                        {t.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>}
                      </div>
                      {!readOnly && (
                        <div className="ms-auto flex items-center gap-3">
                          <button type="button" onClick={() => setDraft({ ...t })}
                            className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Edit</button>
                          <button type="button" onClick={() => setConfirming(t)}
                            className="text-xs font-600 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400">Delete</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={panel}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <h2 className={h2}>Department codes</h2>
                  <p className={sub}>
                    The middle of every code. Departments are this studio's top-level sections, so this list is whatever
                    the studio is divided into today.
                  </p>
                </div>
                {!readOnly && codesDirty && (
                  <button type="button" className={`${btn} ms-auto`} disabled={busy} onClick={saveCodes}>
                    {busy ? "Saving…" : "Save codes"}
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((d) => (
                  <div key={d.id}>
                    <label className={label} htmlFor={`dept-${d.id}`}>{d.name}</label>
                    <input
                      id={`dept-${d.id}`}
                      className={`${input} font-mono uppercase`}
                      value={codes[d.id] ?? data.departmentCodes?.[d.id] ?? ""}
                      disabled={readOnly}
                      maxLength={4}
                      onChange={(e) => {
                        const v = cleanCodePart(e.target.value) || e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
                        setCodes((c) => ({ ...c, [d.id]: v }));
                        setCodesDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>
              {departments.length === 0 && (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  This studio has no departments to file documents under yet.
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {draft && (
        <Dialog
          title={draft.id ? `Edit ${draft.name || "type"}` : "Add a document type"}
          onClose={() => setDraft(null)}
          width="max-w-[560px]"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="t-name">Name</label>
              <input id="t-name" className={input} value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className={label} htmlFor="t-prefix">Prefix</label>
              <input id="t-prefix" className={`${input} font-mono uppercase`} value={draft.prefix} maxLength={4}
                onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) }))} />
            </div>
            <div className="sm:col-span-3">
              <label className={label} htmlFor="t-desc">What this kind of document is for</label>
              <textarea id="t-desc" rows={3} className={input} value={draft.description || ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
          </div>
          {draft.id && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              The prefix can only change while no document has been issued under it — once one has, its code already
              carries the old prefix and nothing may renumber it.
            </p>
          )}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
            <button type="button" className={btn} disabled={busy} onClick={saveType}>
              {busy ? "Saving…" : draft.id ? "Save" : "Add"}
            </button>
          </div>
        </Dialog>
      )}

      {confirming && (
        <Dialog title={`Delete ${confirming.name}?`} onClose={() => setConfirming(null)} width="max-w-[460px]">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This only removes the type. If any document has been filed under it, the type stays — those documents carry
            its prefix in their codes.
          </p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setConfirming(null)}>Cancel</button>
            <button type="button" disabled={busy}
              className="rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              onClick={async () => { const r = await send("DELETE", { id: confirming.id }); if (r) setConfirming(null); }}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
