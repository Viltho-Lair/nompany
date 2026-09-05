// ONE TENDER'S PACK, AND THE QUESTIONS ASKED ABOUT IT.
//
// IT SITS BENEATH THE BILL on the same tender page, and it carries its own
// warning rather than pushing one up into the grid's header. The bill already
// warns about the thing the bill knows — that some lines are unpriced. This
// panel warns about the thing only the paperwork knows: that something arrived
// AFTER the last line was priced. Each warning sits next to what it is about,
// and the one here sits next to the list of what actually changed, which is the
// only place a reader can act on it.
//
// A REISSUED DOCUMENT DOES NOT OVERWRITE THE ONE BEFORE IT. The old revision is
// marked as replaced and stays, because "what did we price against" has to be
// answerable afterwards — so the screen draws the chain rather than the file.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tenderingDict } from "@/shared/studio/tendering";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, microLabel, Empty, Dialog, fmtDate, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { refusal } from "@/components/studio2/tenderRefusals";
import {
  chainFor, currentDocuments, documentSummary, isAnswered, openClarifications,
} from "@/modules/tendering/documents";

const KINDS = ["received", "addendum", "submitted"];

const kindTone = {
  addendum: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  submitted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  received: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
};

export default function StudioTenderDocs({ slug, tenderId }) {
  const tr = tenderingDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [docForm, setDocForm] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const [asking, setAsking] = useState(null);
  const [answering, setAnswering] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(
      `/api/studios/${slug}/tendering/documents?tenderId=${encodeURIComponent(tenderId)}`,
      { cache: "no-store" },
    );
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, tenderId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  // The same guarded load the bill above it uses, and for the same reason: this
  // is part of a RECORD page, which can be pointed at a different tender while
  // the first request is still in the air.
  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  const send = useCallback(async (what, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/tendering/${what}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  const documents = useMemo(() => data?.documents || [], [data]);
  const clarifications = useMemo(() => data?.clarifications || [], [data]);
  const current = useMemo(() => currentDocuments(documents), [documents]);
  const counts = useMemo(() => documentSummary(documents), [documents]);
  const open = useMemo(() => openClarifications(clarifications), [clarifications]);
  const lag = data?.lag;
  const canEdit = Boolean(data?.canEdit);

  // Nothing is drawn until the pack has loaded — a skeleton here would sit
  // under a grid that has already rendered, which reads as a second screen
  // still arriving rather than as one panel filling in.
  if (!data) return null;

  const saveDoc = async () => {
    const form = docForm;
    let url = form.url || "";
    let filename = form.filename || "";
    let size = form.size || 0;

    // THE FILE GOES UP FIRST, and only its URL travels in the body — so a
    // document record is never written against an upload that failed. Private,
    // and named with this studio's slug: /api/media verifies membership before
    // it writes, and the read path checks it again before it serves.
    if (form.file) {
      setBusy(true);
      const body = new FormData();
      body.append("file", form.file);
      body.append("slug", slug);
      const up = await fetch("/api/media?kind=private", { method: "POST", body });
      setBusy(false);
      if (!up.ok) { setError(up.status === 413 ? tr.fileTooLarge : tr.uploadFailed); return; }
      const stored = await up.json();
      url = stored.url; filename = form.file.name; size = form.file.size;
    }

    const payload = {
      title: form.title, kind: form.kind, reference: form.reference,
      revision: form.revision, issuedOn: form.issuedOn, notes: form.notes,
    };
    // The file is sent only when there is a new one. A plain edit must not
    // blank the attachment somebody already made.
    if (url) Object.assign(payload, { url, filename, size });

    const done = form.id
      ? await send("documents", "PUT", { ...payload, id: form.id })
      : await send("documents", "POST", { ...payload, tenderId });
    if (done) setDocForm(null);
  };

  const kindLabel = (k) => (k === "addendum" ? tr.kindAddendum : k === "submitted" ? tr.kindSubmitted : tr.kindReceived);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {/* THE WARNING THIS WHOLE PANEL EXISTS FOR. A BOQ line has no idea a
          document was reissued, so the paperwork is the only thing that can
          say the bill is behind it — and it says which documents, because
          "something changed" is not actionable. */}
      {lag?.stale && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-700 text-amber-900 dark:text-amber-200">{tr.billIsBehind}</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/90">{tr.billIsBehindBody(lag.behind.length)}</p>
          <ul className="mt-2 space-y-1">
            {lag.behind.map((c) => (
              <li key={`${c.kind}-${c.id}`} className="text-xs text-amber-800 dark:text-amber-200/90">
                · {c.label || (c.kind === "clarification" ? tr.theQuestion : tr.docTitle)}
                <span className="ms-2 text-amber-700/80 dark:text-amber-200/60">{fmtDateTime(c.at)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/70">{tr.lastPricedOn}: {fmtDateTime(lag.pricedAt)}</p>
        </div>
      )}

      {/* ---- the pack ---- */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{tr.documents}</h2>
            <p className={sub}>{tr.documentsSub}</p>
          </div>
          {canEdit && (
            <button type="button" className={btn}
              onClick={() => setDocForm({ kind: "received", title: "", reference: "", revision: "", issuedOn: "", notes: "" })}>
              {tr.addDocument}
            </button>
          )}
        </div>

        {counts.superseded > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {tr.currentDocuments}: {counts.current} · {tr.nSuperseded(counts.superseded)}
          </p>
        )}

        {current.length === 0 ? (
          <div className="mt-4"><Empty title={tr.noDocumentsYet} body={tr.noDocumentsBody} /></div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
            {current.map((d) => {
              const history = chainFor(documents, d.id);
              return (
                <li key={d.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-700 ${kindTone[d.kind] || kindTone.received}`}>
                          {kindLabel(d.kind)}
                        </span>
                        <span className="font-600 text-slate-900 dark:text-white">{d.title}</span>
                        {d.revision && <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{tr.docRevision} {d.revision}</span>}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {d.reference && <span className="font-mono">{d.reference}</span>}
                        {d.reference && d.issuedOn && " · "}
                        {d.issuedOn && <>{tr.docIssuedOn} {fmtDate(d.issuedOn)}</>}
                        {!d.url && <span className="ms-2 italic">{tr.noFileAttached}</span>}
                      </p>
                      {d.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.notes}</p>}
                      {history.length > 0 && (
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {tr.replaces}: {history.map((h) => [h.title, h.revision].filter(Boolean).join(" ")).join(" ← ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* THE BLOB URL IS NEVER LINKED DIRECTLY. /api/media/<id>
                          re-checks membership and streams the bytes, which is
                          what keeps the access decision in code. */}
                      {d.url && <a className={btnRow} href={d.url} target="_blank" rel="noreferrer">{tr.openFile}</a>}
                      {canEdit && <button type="button" className={btnRow} onClick={() => setDocForm({ ...d, file: null })}>{tr.edit}</button>}
                      {canEdit && current.length > 1 && (
                        <button type="button" className={btnRow} onClick={() => setReplacing({ id: d.id, replacementId: "" })}>
                          {tr.markReplaced}
                        </button>
                      )}
                      {canEdit && (
                        <button type="button" className={btnRowDanger} disabled={busy}
                          onClick={() => send("documents", "DELETE", { id: d.id })}>{tr.deleteLine}</button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- the questions ---- */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{tr.clarifications}</h2>
            <p className={sub}>{tr.clarificationsSub}</p>
          </div>
          {canEdit && (
            <button type="button" className={btn} onClick={() => setAsking({ question: "", askedOn: "" })}>
              {tr.askQuestion}
            </button>
          )}
        </div>

        {clarifications.length > 0 && (
          <p className={`mt-3 text-xs font-600 ${open.length ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}`}>
            {open.length ? tr.nOpenQuestions(open.length) : tr.allAnswered}
          </p>
        )}

        {/* A BID THAT WENT IN WITH QUESTIONS OUTSTANDING PRICED ASSUMPTIONS,
            and it is worth saying so after the fact rather than only before.
            Not a refusal: issuers routinely never answer, and refusing to
            record a submission over it would make the register lie about what
            the studio actually did.

            READ FROM `submittedAt`, NOT FROM THE STATUS. The stamp is what the
            stage transition writes when the bid actually goes in, and a
            withdrawn or lost tender was still submitted — testing the status
            would mean this screen keeping its own copy of which stages count,
            which is the duplication the sales dashboard had to be rescued
            from. */}
        {open.length > 0 && Boolean(data.tender?.submittedAt) && (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-600 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {tr.submittedWithOpenQuestions(open.length)}
          </p>
        )}

        {clarifications.length === 0 ? (
          <div className="mt-4"><Empty title={tr.noQuestionsYet} body={tr.noQuestionsBody} /></div>
        ) : (
          <ol className="mt-4 space-y-4">
            {clarifications.map((c) => (
              <li key={c.id} className={`rounded-xl border p-4 ${isAnswered(c) ? "border-slate-200 dark:border-white/10" : "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/[0.06]"}`}>
                <p className={microLabel}>
                  {c.seq}. {c.askedOn ? `${tr.askedOn} ${fmtDate(c.askedOn)}` : tr.askedOn}
                  {c.affectsPrice && <span className="ms-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{tr.affectsPrice}</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-white">{c.question}</p>
                {isAnswered(c) ? (
                  <div className="mt-3 border-s-2 border-emerald-300 ps-3 dark:border-emerald-500/40">
                    <p className={microLabel}>{tr.answeredOn} {fmtDateTime(c.answeredAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{c.answer}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-600 text-amber-700 dark:text-amber-300">{tr.awaitingAnswer}</p>
                )}
                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button type="button" className={btnRow}
                      onClick={() => setAnswering({ id: c.id, answer: c.answer || "", affectsPrice: Boolean(c.affectsPrice) })}>
                      {isAnswered(c) ? tr.edit : tr.recordAnswer}
                    </button>
                    <button type="button" className={btnRowDanger} disabled={busy}
                      onClick={() => send("clarifications", "DELETE", { id: c.id })}>{tr.deleteLine}</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {docForm && (
        <Dialog title={docForm.id ? tr.editDocument : tr.addDocument} onClose={() => setDocForm(null)} width="max-w-[640px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr,12rem]">
              <Field label={tr.docTitle} required value={docForm.title || ""}
                onChange={(v) => setDocForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
              <Field label={tr.docKind} as="select" value={docForm.kind || "received"}
                options={KINDS.map((k) => ({ value: k, label: kindLabel(k) }))}
                onChange={(v) => setDocForm((f) => ({ ...f, kind: v }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.docReference} value={docForm.reference || ""}
                onChange={(v) => setDocForm((f) => ({ ...f, reference: v }))} inputProps={{ maxLength: 80 }} />
              <Field label={tr.docRevision} value={docForm.revision || ""}
                onChange={(v) => setDocForm((f) => ({ ...f, revision: v }))} inputProps={{ maxLength: 40 }} />
              <Field label={tr.docIssuedOn} type="date" value={docForm.issuedOn || ""}
                onChange={(v) => setDocForm((f) => ({ ...f, issuedOn: v }))} />
            </div>
            <div>
              <span className={microLabel}>{tr.attachFile}</span>
              <input type="file" className="block w-full text-sm text-slate-600 dark:text-slate-300"
                onChange={(e) => setDocForm((f) => ({ ...f, file: e.target.files?.[0] || null }))} />
              {docForm.filename && !docForm.file && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{docForm.filename}</p>
              )}
            </div>
            <Field label={tr.notes} as="textarea" value={docForm.notes || ""}
              onChange={(v) => setDocForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 2000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setDocForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !docForm.title?.trim()} onClick={saveDoc}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {replacing && (
        <Dialog title={tr.markReplaced} description={tr.markReplacedHint} onClose={() => setReplacing(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <Field label={tr.pickReplacement} as="select" required value={replacing.replacementId}
              options={current.filter((d) => d.id !== replacing.id)
                .map((d) => ({ value: d.id, label: [d.title, d.revision].filter(Boolean).join(" ") }))}
              onChange={(v) => setReplacing((r) => ({ ...r, replacementId: v }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setReplacing(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !replacing.replacementId}
                onClick={async () => {
                  const done = await send("documents", "PUT", { id: replacing.id, supersededById: replacing.replacementId });
                  if (done) setReplacing(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {asking && (
        <Dialog title={tr.askQuestion} onClose={() => setAsking(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <Field label={tr.theQuestion} as="textarea" required value={asking.question}
              onChange={(v) => setAsking((a) => ({ ...a, question: v }))} inputProps={{ maxLength: 4000 }} />
            <Field label={tr.askedOn} type="date" value={asking.askedOn}
              onChange={(v) => setAsking((a) => ({ ...a, askedOn: v }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAsking(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !asking.question.trim()}
                onClick={async () => {
                  const done = await send("clarifications", "POST", { ...asking, tenderId });
                  if (done) setAsking(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {answering && (
        <Dialog title={tr.recordAnswer} onClose={() => setAnswering(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <Field label={tr.theAnswer} as="textarea" value={answering.answer}
              onChange={(v) => setAnswering((a) => ({ ...a, answer: v }))} inputProps={{ maxLength: 4000 }} />
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={answering.affectsPrice}
                onChange={(e) => setAnswering((a) => ({ ...a, affectsPrice: e.target.checked }))} />
              <span>
                {tr.affectsPrice}
                <span className="block text-xs text-slate-500 dark:text-slate-400">{tr.affectsPriceHint}</span>
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAnswering(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("clarifications", "PUT", answering);
                  if (done) setAnswering(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
