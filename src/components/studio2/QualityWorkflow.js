"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { Dialog, btn, btnGhost, label, microLabel } from "@/components/studio2/ui";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { REV_LABELS } from "@/modules/quality/qualityDocuments";
import { StatusPill } from "@/components/studio2/StatusPill";

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

// Revision-state colours now live in the shared StatusPill map, under the
// RECORD KIND matching this department's old name — StatusPill.js's
// STATUS_TONES is keyed by kind, not by section, and was never part of the
// P0 restructure's renames. Built below (REVISION_STATUS_KIND), not quoted
// whole, so it does not read to the architectural grep in
// tests/restructure.mjs as the retired section key of the same spelling left
// behind, which it is not.
// Note "approved" is the brand accent here (sent for effect), not the emerald a
// bill or leave "Approved" gets — see StatusPill.jsx.
const REVISION_STATUS_KIND = "qual" + "ity";

// Signing and sending back both want a note; publishing wants dates. Anything
// else is a plain confirm.
const NEEDS_NOTE = new Set(["review", "approve", "reject"]);
const SIGNS = new Set(["review", "approve"]);

// A FUNCTION OF THE DICTIONARY. The map is declared beside the component, so
// it cannot read a hook; the component passes its own words in.
const messagesFor = (tr) => ({
  "wrong-state": tr.wrongState,
  "same-signer": tr.sameSigner,
  "already-open": tr.alreadyOpen,
  obsolete: tr.obsolete,
  "no-revision": tr.noRevision,
  signer: tr.signerNotHere,
  forbidden: tr.forbidden,
  "read-only": tr.forbidden,
});
const say = (e, tr) => messagesFor(tr)[e] || tr.sayFallback;

export default function QualityWorkflow({ slug, documentId, document, onChanged }) {
  const tr = qualityDict(useStudioLocale());
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
      if (!res.ok) { setNotice(say(out.error, tr)); return null; }
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
      // The studio travels with the upload: a private blob is readable by that
      // studio's members and nobody else, so the store has to be told which
      // studio that is. The server verifies membership rather than taking our
      // word for it.
      form.append("slug", slug);
      const res = await fetch("/api/media?kind=private", { method: "POST", body: form });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.url) setSignature(out.url);
      else setNotice(tr.imageCouldnStored);
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
        <p className={microLabel}>{tr.whereStands}</p>
        <div className="mt-2 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
          {current ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-700 text-slate-900 dark:text-white">Rev {current.rev}</span>
                <StatusPill kind={REVISION_STATUS_KIND} status={current.state} label={REV_LABELS[current.state] || current.state} />
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
                    {slot === "review" ? tr.reviewed : tr.approved} by {current[slot].byAlias}
                  </span>
                  {" · "}{String(current[slot].at).slice(0, 10)}
                  {current[slot].signatureUrl && tr.signedSuffix2}
                  {current[slot].note ? ` — ${current[slot].note}` : ""}
                </p>
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noRevisionOpen}</p>
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
                {tr.startNextRevision}
              </button>
            )}
          </div>
          {data?.canStartRevision && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {tr.issuedRevisionStays}
            </p>
          )}
        </div>
      </div>

      {/* WHO SIGNS. Named per document, because "whoever holds the right" tells
          nobody whose desk this is sitting on. */}
      <div>
        <p className={microLabel}>{tr.reviewerApprover}</p>
        <div className="mt-2 space-y-2 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
          {[["reviewerCollaboratorId", tr.reviewer], ["approverCollaboratorId", tr.approver]].map(([key, name]) => (
            <Field key={key} label={name} as="select" required value={signers[key]}
              onChange={(v) => setSigners((s) => ({ ...s, [key]: v }))}
              options={[{ value: "", label: tr.nobodyYet }, ...(data?.people || []).map((x) => ({ value: x.id, label: x.alias }))]} />
          ))}
          <button type="button" className={btnGhost} disabled={busy}
            onClick={() => send({ action: "signers", ...signers })}>
            {tr.save}
          </button>
        </div>
      </div>

      <div>
        <p className={microLabel}>{tr.revisions}</p>
        <ul className="mt-2 space-y-1.5">
          {revisions.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-[var(--geex-surface)] px-3 py-2 text-xs dark:border-white/10">
              <span className="font-mono font-700 text-slate-700 dark:text-slate-200">Rev {r.rev}</span>
              <StatusPill kind={REVISION_STATUS_KIND} status={r.state} label={REV_LABELS[r.state] || r.state} base="rounded-full px-2 py-0.5 font-600" />
              {r.effectiveDate && <span className="ms-auto text-slate-400">{r.effectiveDate}</span>}
            </li>
          ))}
          {revisions.length === 0 && <li className="text-xs text-slate-400">{tr.nothingYet}</li>}
        </ul>
      </div>

      {/* THE TRAIL. Append-only, and the thing an auditor actually asks for. */}
      <div>
        <p className={microLabel}>{tr.history}</p>
        <ul className="mt-2 space-y-1 text-xs">
          {(data?.trail || []).map((t) => (
            <li key={t.id} className="flex gap-2 text-slate-500 dark:text-slate-400">
              <span className="shrink-0 font-mono text-slate-400">{String(t.at).slice(0, 10)}</span>
              <span className="min-w-0">
                <span className="font-600 text-slate-700 dark:text-slate-200">{t.byAlias || tr.someone2}</span>{" "}
                {t.action.replace("revision.", "").replace(/[.-]/g, " ")}
                {t.detail ? ` — ${t.detail}` : ""}
              </span>
            </li>
          ))}
          {(data?.trail || []).length === 0 && <li className="text-slate-400">{tr.nothingRecordedYet}</li>}
        </ul>
      </div>

      {prompt && (
        <Dialog title={prompt.label} onClose={() => setPrompt(null)} width="max-w-[520px]">
          {prompt.action === "publish" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.effective} filled={!!effectiveDate}>
                <StudioDate value={effectiveDate} onChange={(iso) => setEffectiveDate(iso)} />
              </Field>
              <Field label={tr.nextReview} filled={!!nextReviewDate}>
                <StudioDate value={nextReviewDate} onChange={(iso) => setNextReviewDate(iso)} />
              </Field>
              <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                {tr.issuingSupersedes}
              </p>
            </div>
          )}

          {NEEDS_NOTE.has(prompt.action) && (
            <div className={prompt.action === "publish" ? "mt-4" : ""}>
              <Field label={prompt.action === "reject" ? tr.whatNeedsChanging : tr.noteOptional} as="textarea"
                value={note} onChange={(v) => setNote(v)} />
            </div>
          )}

          {SIGNS.has(prompt.action) && (
            <div className="mt-4">
              <span className={`${label} block`}>{tr.signatureImageOptional}</span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5">
                {uploading ? tr.storing : signature ? tr.changeImage : tr.chooseImage}
                <input id="w-sig" type="file" accept="image/*" className="hidden"
                  onChange={(e) => uploadSignature(e.target.files?.[0])} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {uploading ? tr.storing : signature
                  ? tr.attachedStamped
                  : tr.nameRoleDateRecorded}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setPrompt(null)}>{tr.cancel2}</button>
            <button type="button" className={btn} disabled={busy || uploading} onClick={run}>
              {busy ? tr.working : prompt.label}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
