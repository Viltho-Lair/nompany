"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { qualityDict } from "@/shared/studio/quality";
import { Dialog, btn, btnGhost, input, label, microLabel } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

// DISTRIBUTION — who has to read this, who has, and who has not.
//
// The register proves a document exists and the workflow proves it was
// approved. Neither answers the question an auditor actually finishes on: can
// you show me that the people doing the work have seen the current revision.
// This is where that is answered, and the answer resets every time a new
// revision is issued — because having read rev 2 says nothing about rev 3.

const MESSAGES = {
  "not-issued": "Only an issued revision can be shared outside the studio.",
  "nothing-to-acknowledge": "There's nothing waiting for your acknowledgement.",
  forbidden: "You don't have permission to do that.",
  "read-only": "You don't have permission to do that.",
};
const say = (e) => MESSAGES[e] || "That didn't work. Try again.";

export default function QualityDistribution({ slug, documentId, document }) {
  const tr = qualityDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [days, setDays] = useState(30);
  const [minted, setMinted] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/quality/distribution?id=${encodeURIComponent(documentId)}`, { cache: "no-store" });
    if (!res.ok) return;
    setData(await res.json());
  }, [slug, documentId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setChosen(Array.isArray(document?.distributionCollaboratorIds) ? document.distributionCollaboratorIds : []);
  }, [document?.distributionCollaboratorIds]);

  const send = async (payload) => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/studios/${slug}/quality/distribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, ...payload }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice(say(out.error)); return null; }
      await load();
      return out;
    } finally { setBusy(false); }
  };

  const dist = data?.distribution;
  const recipients = dist?.recipients || [];

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{notice}</p>
      )}

      {/* THE READER'S OWN OBLIGATION, first and unmissable. Everything else on
          this panel is about other people; this is the one thing the person
          looking at it has to do. */}
      {data?.mine && !data.mine.acknowledgedAt && (
        <div className="rounded-geex border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
          <p className="text-sm font-600 text-amber-900 dark:text-amber-200">{tr.documentIssued}</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Confirm you have read revision {dist?.rev} and will work to it.
          </p>
          <button type="button" className={`${btn} mt-3`} disabled={busy}
            onClick={() => send({ action: "acknowledge" })}>
            I have read this
          </button>
        </div>
      )}
      {data?.mine?.acknowledgedAt && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          You acknowledged revision {dist?.rev} on {String(data.mine.acknowledgedAt).slice(0, 10)}.
        </p>
      )}

      <div>
        <div className="flex items-center gap-2">
          <p className={microLabel}>{tr.distribution}</p>
          {data?.canDistribute && (
            <button type="button" onClick={() => setPicking(true)}
              className="ms-auto text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
              Choose recipients
            </button>
          )}
        </div>

        <div className="mt-2 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
          {dist?.rev == null ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Nothing is distributed until a revision is issued.
            </p>
          ) : recipients.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Nobody has been named yet. Choose who has to work to this document and they will be told when it is issued.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Revision {dist.rev}
                {dist.outstanding > 0
                  ? ` · ${dist.outstanding} still to acknowledge`
                  : tr.everybodyAcknowledged}
              </p>
              <ul className="space-y-1.5">
                {recipients.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{r.alias}</span>
                    {r.acknowledgedAt ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-600 text-emerald-700 dark:text-emerald-300">
                        Acknowledged
                      </span>
                    ) : r.readAt ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-600 text-amber-700 dark:text-amber-300">{tr.opened}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        Not opened
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {data?.canShare && (
        <div>
          <div className="flex items-center gap-2">
            <p className={microLabel}>{tr.externalLinks}</p>
            <button type="button" onClick={() => { setMinted(""); setSharing(true); }}
              className="ms-auto text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
              Create a link
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {(data.links || []).map((l) => (
              <li key={l.id} className="rounded-lg border border-slate-200/70 bg-[var(--geex-surface)] px-3 py-2 text-xs dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-700 text-slate-700 dark:text-slate-200">Rev {l.rev}</span>
                  {l.revokedAt ? <span className="text-rose-600 dark:text-rose-400">{tr.revoked}</span>
                    : l.expired ? <span className="text-slate-400">{tr.expired}</span>
                      : <span className="text-emerald-600 dark:text-emerald-400">Live until {String(l.expiresAt).slice(0, 10)}</span>}
                  {!l.revokedAt && !l.expired && (
                    <button type="button" disabled={busy}
                      className="ms-auto font-600 text-slate-500 hover:text-rose-600 dark:text-slate-400"
                      onClick={() => send({ action: "revoke", linkId: l.id })}>
                      Revoke
                    </button>
                  )}
                </div>
                <p className="mt-1 text-slate-400 dark:text-slate-500">
                  Opened {l.accessCount || 0} time{l.accessCount === 1 ? "" : "s"}
                  {l.lastAccessAt ? tr.lastAccessed(String(l.lastAccessAt).slice(0, 10)) : ""}
                </p>
              </li>
            ))}
            {(data.links || []).length === 0 && (
              <li className="text-xs text-slate-400 dark:text-slate-500">{tr.noneLinkBoundOne}</li>
            )}
          </ul>
        </div>
      )}

      {picking && (
        <Dialog title={tr.whoWorkDocument} onClose={() => setPicking(false)} width="max-w-[520px]">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            They are told when a revision is issued, and asked to confirm they have read it. Acknowledgement resets each
            time a new revision goes out — having read rev 2 says nothing about rev 3.
          </p>
          <div className="grid max-h-[45vh] grid-cols-2 gap-2 overflow-y-auto">
            {(data?.people || []).map((x) => {
              const on = chosen.includes(x.id);
              return (
                <label key={x.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${on
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300"}`}>
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on}
                    onChange={() => setChosen((c) => (on ? c.filter((i) => i !== x.id) : [...c, x.id]))} />
                  {x.alias}
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setPicking(false)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy}
              onClick={async () => { const r = await send({ action: "distribute", collaboratorIds: chosen }); if (r) setPicking(false); }}>
              Save
            </button>
          </div>
        </Dialog>
      )}

      {sharing && (
        <Dialog title={tr.shareOutsideStudio} onClose={() => setSharing(false)} width="max-w-[520px]">
          {minted ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">{tr.linkLiveEveryOpen}</p>
              <input readOnly className={`${input} mt-3 font-mono text-xs`} value={`${window.location.origin}${minted}`}
                onFocus={(e) => e.target.select()} />
              <div className="mt-6 flex justify-end">
                <button type="button" className={btn} onClick={() => setSharing(false)}>{tr.done}</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Anybody with the link can read the issued revision without an account. It is stamped
                {" "}<span className="font-600">{tr.uncontrolledCopy}</span>, bound to that one revision, and expires.
              </p>
              <div className="mt-4 max-w-xs">
                <Field label={tr.expiresAfter} as="select" value={String(days)}
                  onChange={(v) => setDays(Number(v))}
                  options={[7, 30, 90, 180, 365].map((d) => ({ value: String(d), label: `${d} days` }))} />
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" className={btnGhost} onClick={() => setSharing(false)}>{tr.cancel}</button>
                <button type="button" className={btn} disabled={busy}
                  onClick={async () => { const r = await send({ action: "share", days }); if (r?.url) setMinted(r.url); }}>
                  Create the link
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
