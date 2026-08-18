"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, btn, btnGhost, input, label, microLabel } from "@/components/studio2/ui";
import { REV_LABELS } from "@/lib/qualityDocuments";

// THE CONTROL PANEL — where a revision moves along the ladder.
//
// It draws the buttons the SERVER says are available. It does not work out for
// itself which moves make sense: that is the TRANSITIONS table, the service
// enforces it, and a screen that reimplements the rules to decide what to show
// is a second copy which disagrees with the first the moment either changes.
// Ask, then draw.
//
// The consequence worth noticing: a button here can always be pressed. Nothing
// is offered and then refused.

const STATE_TONE = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approval: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  effective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  superseded: "bg-slate-100 text-slate-500 line-through dark:bg-white/5",
};

// Signing and sending back both want a note; publishing wants dates. Anything
// else is a plain confirm.
const NEEDS_NOTE = new Set(["review", "approve", "reject"]);
const SIGNS = new Set(["review", "approve"]);

const MESSAGES = {
  "wrong-state": "This revision has moved on since the screen was drawn. Reload to see where it is.",
  "same-signer": "The same person can't review and approve one revision — that is what the two signatures are for.",
  "already-open": "A revision is already open on this document.",
  obsolete: "This document has been withdrawn.",
  "no-revision": "There is no revision to move.",
  signer: "That person isn't in this studio.",
  forbidden: "You don't have permission to do that.",
  "read-only": "You don't have permission to do that.",
};
const say = (e) => MESSAGES[e] || "That didn't work. Try again.";

export default function QualityWorkflow({ slug, documentId, document, onChanged }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState(null);   // { action, label }
  const [note, setNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [signature, setSignature] = useState("");
  const [uploading, setUploading] = useState(false);
  const [signers, setSigners] = useState({ reviewerCollaboratorId: "", approverCollaboratorId: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/quality/workflow?id=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!res.ok) return;
    setData(await res.json());
  }, [slug, documentId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSigners({
      reviewerCollaboratorId: document?.reviewerCollaboratorId || "",
      approverCollaboratorId: document?.approverCollaboratorId || "",
    });
  }, [document?.reviewerCollaboratorId, document?.approverCollaboratorId]);

  const send = async (payload) => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/studios/${slug}/quality/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, ...payload }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(say(out.error)); return null; }
      await load();
      onChanged?.();
      return out;
    } finally {
      setBusy(false);
    }
  };

  // The signature graphic goes through the studio's ordinary media store, and
  // the service only accepts a URL of exactly that shape — so what gets stamped
  // on a document can only ever be something we hold.
  const uploadSignature = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media?kind=private", { method: "POST", body: form });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.url) setSignature(out.url);
      else setNotice("That image couldn't be stored.");
    } finally {
      setUploading(false);
    }
  };

  const run = async () => {
    const payload = { action: prompt.action, note };
    if (SIGNS.has(prompt.action) && signature) payload.signatureUrl = signature;
    if (prompt.action === "publish") { payload.effectiveDate = effectiveDate; payload.nextReviewDate = nextReviewDate; }
    const out = await send(payload);
    if (out) { setPrompt(null); setNote(""); setSignature(""); }
  };

  const revisions = data?.revisions || [];
  const current = revisions.find((r) => !["superseded"].includes(r.state));

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{notice}</p>
      )}

      <div>
        <p className={microLabel}>Where it stands</p>
        <div className="mt-2 rounded-geex border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-[#20202c]">
          {current ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-700 text-slate-900 dark:text-white">Rev {current.rev}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATE_TONE[current.state] || STATE_TONE.draft}`}>
                  {REV_LABELS[current.state] || current.state}
                </span>
              </div>
              {current.rejection?.byAlias && (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                  Sent back by {current.rejection.byAlias}
                  {current.rejection.note ? ` — ${current.rejection.note}` : ""}
                </p>
              )}
              {/* The two signatures, as evidence rather than as status. */}
              {["review", "approval"].map((slot) => current[slot]?.byAlias && (
                <p key={slot} className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-600 text-slate-700 dark:text-slate-200">
                    {slot === "review" ? "Reviewed" : "Approved"} by {current[slot].byAlias}
                  </span>
                  {" · "}{String(current[slot].at).slice(0, 10)}
                  {current[slot].signatureUrl && " · signed"}
                  {current[slot].note ? ` — ${current[slot].note}` : ""}
                </p>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No revision open.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.available || []).map((a) => (
              <button key={a.action} type="button" disabled={busy}
                className={a.action === "reject" || a.action === "withdraw" ? btnGhost : btn}
                onClick={() => {
                  setNote(""); setSignature("");
                  setEffectiveDate(new Date().toISOString().slice(0, 10));
                  setNextReviewDate(document?.nextReviewDate || "");
                  setPrompt(a);
                }}>
                {a.label}
              </button>
            ))}
            {data?.canStartRevision && (
              <button type="button" className={btn} disabled={busy}
                onClick={() => send({ action: "start-revision" })}>
                Start the next revision
              </button>
            )}
          </div>
          {data?.canStartRevision && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              The issued revision stays exactly as it is until the new one is published over it.
            </p>
          )}
        </div>
      </div>

      {/* WHO SIGNS. Named per document, because "whoever holds the right" tells
          nobody whose desk this is sitting on. */}
      <div>
        <p className={microLabel}>Reviewer and approver</p>
        <div className="mt-2 space-y-2 rounded-geex border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-[#20202c]">
          {[["reviewerCollaboratorId", "Reviewer"], ["approverCollaboratorId", "Approver"]].map(([key, name]) => (
            <div key={key}>
              <label className={label} htmlFor={`sig-${key}`}>{name}</label>
              <select id={`sig-${key}`} className={input} value={signers[key]}
                onChange={(e) => setSigners((s) => ({ ...s, [key]: e.target.value }))}>
                <option value="">Nobody yet</option>
                {(data?.people || []).map((x) => <option key={x.id} value={x.id}>{x.alias}</option>)}
              </select>
            </div>
          ))}
          <button type="button" className={btnGhost} disabled={busy}
            onClick={() => send({ action: "signers", ...signers })}>
            Save
          </button>
        </div>
      </div>

      <div>
        <p className={microLabel}>Revisions</p>
        <ul className="mt-2 space-y-1.5">
          {revisions.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#20202c]">
              <span className="font-mono font-700 text-slate-700 dark:text-slate-200">Rev {r.rev}</span>
              <span className={`rounded-full px-2 py-0.5 font-600 ${STATE_TONE[r.state] || STATE_TONE.draft}`}>
                {REV_LABELS[r.state] || r.state}
              </span>
              {r.effectiveDate && <span className="ms-auto text-slate-400">{r.effectiveDate}</span>}
            </li>
          ))}
          {revisions.length === 0 && <li className="text-xs text-slate-400">Nothing yet.</li>}
        </ul>
      </div>

      {/* THE TRAIL. Append-only, and the thing an auditor actually asks for. */}
      <div>
        <p className={microLabel}>History</p>
        <ul className="mt-2 space-y-1 text-xs">
          {(data?.trail || []).map((t) => (
            <li key={t.id} className="flex gap-2 text-slate-500 dark:text-slate-400">
              <span className="shrink-0 font-mono text-slate-400">{String(t.at).slice(0, 10)}</span>
              <span className="min-w-0">
                <span className="font-600 text-slate-700 dark:text-slate-200">{t.byAlias || "Someone"}</span>{" "}
                {t.action.replace("revision.", "").replace(/[.-]/g, " ")}
                {t.detail ? ` — ${t.detail}` : ""}
              </span>
            </li>
          ))}
          {(data?.trail || []).length === 0 && <li className="text-slate-400">Nothing recorded yet.</li>}
        </ul>
      </div>

      {prompt && (
        <Dialog title={prompt.label} onClose={() => setPrompt(null)} width="max-w-[520px]">
          {prompt.action === "publish" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="w-eff">Effective from</label>
                <input id="w-eff" type="date" className={input} value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="w-rev">Next review</label>
                <input id="w-rev" type="date" className={input} value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)} />
              </div>
              <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                Issuing this revision supersedes the one before it. The old one is kept and stays readable — that is
                what makes it possible to say what the procedure used to require.
              </p>
            </div>
          )}

          {NEEDS_NOTE.has(prompt.action) && (
            <div className={prompt.action === "publish" ? "mt-4" : ""}>
              <label className={label} htmlFor="w-note">
                {prompt.action === "reject" ? "What needs changing?" : "Note (optional)"}
              </label>
              <textarea id="w-note" rows={3} className={input} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}

          {SIGNS.has(prompt.action) && (
            <div className="mt-4">
              <label className={label} htmlFor="w-sig">Signature image (optional)</label>
              <input id="w-sig" type="file" accept="image/*" className="block w-full text-xs text-slate-500"
                onChange={(e) => uploadSignature(e.target.files?.[0])} />
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {uploading ? "Storing…" : signature
                  ? "Attached — it will be stamped above your name."
                  : "Your name, role and the date are recorded either way. The image is decoration on top of that."}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setPrompt(null)}>Cancel</button>
            <button type="button" className={btn} disabled={busy || uploading} onClick={run}>
              {busy ? "Working…" : prompt.label}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
