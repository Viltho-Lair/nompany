"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { apiKeysDict } from "@/shared/studio/apiKeys";
import { operationsDict } from "@/shared/studio/operations";
import { Dialog, panel, btn, btnGhost, Empty, sub } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { fmtDate } from "@/lib/format";

// THIS STUDIO'S API KEYS.
//
// IT VALIDATES NOTHING ITSELF, the posture every register on this screen takes:
// the rules are `modules/administration/apiKeys`, which the server refuses on,
// and the screen shows what came back.
//
// THE KEY IS SHOWN ONCE, IN ITS OWN DIALOG, and the dialog says so before it
// says anything else. Somebody who closes it without copying has lost the key
// and the product genuinely cannot get it back — only a fingerprint is stored —
// so the warning is the heading rather than a footnote.
//
// THE PERMISSION LIST IS WHAT THE READER HOLDS, served by the route. Offering
// anything wider would be a picker whose choices the server refuses, which
// teaches people to distrust the screen.
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

const STATE_STYLE = {
  live: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  revoked: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
  expired: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export default function ApiKeysPanel({ keys, grantable, canManage, busy, send, issue }) {
  const locale = useStudioLocale();
  const tr = apiKeysDict(locale);
  const ops = operationsDict(locale);
  const [adding, setAdding] = useState(false);
  const [minted, setMinted] = useState(null);

  return (
    <>
      <p className={sub}>{tr.lead}</p>
      {canManage && <button className={btn} onClick={() => setAdding(true)}>{tr.issue}</button>}

      {adding && (
        <Dialog title={tr.newKey} onClose={() => setAdding(false)}>
          <IssueForm
            grantable={grantable}
            busy={busy}
            tr={tr}
            ops={ops}
            onCancel={() => setAdding(false)}
            onSave={async (values) => {
              const key = await issue(values);
              if (key) { setAdding(false); setMinted(key); }
            }}
          />
        </Dialog>
      )}

      {/* THE ONE-TIME REVEAL. Its own dialog rather than a line in the list,
          because it is the only moment the key exists outside the server and
          the person has to act on it before they close it. */}
      {minted && (
        <Dialog title={tr.copyNow} onClose={() => setMinted(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{tr.copyNowBody}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
            {minted}
          </pre>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {tr.usage}: <code>{tr.usageBody}</code>
          </p>
          <div className="mt-4 flex gap-2">
            <CopyButton value={minted} tr={tr} />
            <button className={btnGhost} onClick={() => setMinted(null)}>{tr.done}</button>
          </div>
        </Dialog>
      )}

      {keys.length === 0 ? <Empty title={tr.empty} body={tr.emptyBody} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{k.name}</span>
                    <code className="num rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      {k.prefix}…
                    </code>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATE_STYLE[k.state]}`}>
                      {tr.state[k.state]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {tr.scopeCount(k.scopes.length)} · {tr.created} {fmtDate(k.createdAt, locale)}
                    {" · "}
                    {k.lastUsedAt ? `${tr.lastUsed} ${fmtDate(k.lastUsedAt, locale)}` : tr.neverUsed}
                    {k.expiresAt ? ` · ${tr.expires} ${fmtDate(k.expiresAt, locale)}` : ""}
                  </p>
                  {/* SAID ON THE ROW, because a register that listed stored
                      scopes without it would overstate what the key can do the
                      moment its holder is demoted. */}
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{tr.narrowing}</p>
                </div>
                {canManage && k.state !== "revoked" && (
                  <button className={btnDanger} disabled={busy}
                    onClick={() => { if (confirm(tr.revokeConfirm)) send("DELETE", { id: k.id }); }}>
                    {tr.revoke}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{tr.lastUsedHint}</p>
        </section>
      )}
    </>
  );
}

function CopyButton({ value, tr }) {
  const [done, setDone] = useState(false);
  return (
    <button className={btn} onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); } catch { setDone(false); }
    }}>
      {done ? tr.copied : tr.copy}
    </button>
  );
}

function IssueForm({ grantable, busy, tr, ops, onCancel, onSave }) {
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [scopes, setScopes] = useState([]);
  const [filter, setFilter] = useState("");

  const shown = filter
    ? grantable.filter((p) => p.toLowerCase().includes(filter.toLowerCase()))
    : grantable;
  const toggle = (p) =>
    setScopes((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} required value={name} onChange={setName} hint={tr.nameHint} />
        <Field label={tr.expires} type="date" value={expiresAt} onChange={setExpiresAt}
          hint={tr.expiresHint} />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.permissions}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">{tr.selected(scopes.length)}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{tr.permissionsHint}</p>
        <div className="mt-2">
          <Field label={tr.search} value={filter} onChange={setFilter} />
        </div>
        {/* SCROLLED RATHER THAN PAGED. An owner holds ~200 rights and the list
            is a checklist somebody scans for two of them; paging it would hide
            the one they are looking for behind a control they have to find. */}
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-white/10">
          {shown.map((p) => (
            <label key={p} className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={scopes.includes(p)} onChange={() => toggle(p)} />
              <code className="text-xs">{p}</code>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !name.trim() || scopes.length === 0}
          onClick={() => onSave({ name, expiresAt, scopes })}>
          {busy ? ops.saving : tr.issue}
        </button>
        <button className={btnGhost} onClick={onCancel}>{ops.cancel}</button>
      </div>
    </div>
  );
}
