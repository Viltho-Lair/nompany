"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHead, CardBody, Badge, Icon, SkeletonText, toneBg, toneInk } from "../../_components/ui";

// ONE ENCRYPTION KEY — the owner's decision of 17/09/2026.
//
// Stored credentials written under the retired FIELD_ENCRYPTION_KEY are moved
// onto NOMPANY_DATA_KEY from here, because the old key cannot be read out of
// Vercel and so the conversion has to run inside the deployment
// (platform/auth/rekey.ts). The card shows what a run would touch — document
// names and counts, never a value — and converting takes two clicks, the second
// naming the exact count shown (invariant 17).

export default function EncryptionKeyCard() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async (alive = { current: true }) => {
    try {
      const res = await fetch("/api/super/rekey", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!alive.current) return;
      if (!res.ok) { setError("Couldn't check the stored credentials."); setReport({ documents: [], values: 0, unreadable: [] }); return; }
      setReport(data);
    } catch {
      if (alive.current) setError("Couldn't reach the server.");
    }
  }, []);

  useEffect(() => {
    const alive = { current: true };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(alive);
    return () => { alive.current = false; };
  }, [load]);

  async function run() {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/super/rekey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: report.values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error === "stale"
          ? "The stored credentials changed since this was checked. Look again before converting."
          : data.error === "unreadable"
            ? "A value will not open under either key. Nothing was changed."
            : "The conversion failed. Nothing is lost: every document was saved before it was changed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Couldn't reach the server. Check again before retrying.");
    }
    setRunning(false); setConfirming(false);
    await load();
  }

  const values = report?.values || 0;
  const unreadable = report?.unreadable || [];

  return (
    <Card>
      <CardHead
        title="Encryption key"
        sub="Stored credentials are moved onto NOMPANY_DATA_KEY, the only key, so FIELD_ENCRYPTION_KEY can be removed."
        action={report ? <Badge tone={values ? "warning" : "success"}>{values ? `${values} on the old key` : "All on the one key"}</Badge> : null}
      />
      <CardBody>
        {report === null ? <SkeletonText lines={3} /> : null}

        {report && !values && !result ? (
          <p className="text-sm opacity-70">
            Every stored credential is encrypted with NOMPANY_DATA_KEY. FIELD_ENCRYPTION_KEY is no longer needed to read anything.
          </p>
        ) : null}

        {report && values ? (
          <>
            <p className="text-sm">
              {values} value{values === 1 ? "" : "s"} in {report.documents.length} document{report.documents.length === 1 ? "" : "s"} still
              use the old key. Converting decrypts each with the key that wrote it and encrypts it again with NOMPANY_DATA_KEY.
              Every document is saved first, and nothing is written unless every value opens.
            </p>
            <ul className="mt-3 flex flex-col divide-y divide-slate-200/70 text-xs dark:divide-white/10">
              {report.documents.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-mono">{d.key}</span>
                  <span className="shrink-0 opacity-70">{d.paths.join(", ")}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {unreadable.length ? (
          <div role="alert" className="mt-4 rounded-md px-3 py-2.5 text-sm"
            style={{ backgroundColor: toneBg("danger", 0.12), color: toneInk("danger") }}>
            <p className="font-600">These will not open under either key, so nothing can be converted:</p>
            <ul className="mt-1 list-disc ps-5 text-xs">
              {unreadable.map((u) => <li key={u.key}><span className="font-mono">{u.key}</span> — {u.reason}</li>)}
            </ul>
            <p className="mt-2 text-xs">Enter those credentials again (the Nova key, or reconnect Google Calendar) and check again.</p>
          </div>
        ) : null}

        {result ? (
          <p className="mt-4 text-sm" style={{ color: toneInk(result.left ? "danger" : "success") }}>
            {result.left
              ? `Converted ${result.converted} document(s); ${result.left} still use the old key.`
              : `Converted ${result.converted} document(s). Nothing uses the old key any more.`}
          </p>
        ) : null}

        {error ? (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm"
            style={{ backgroundColor: toneBg("danger", 0.12), color: toneInk("danger") }}>
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {report && values && !unreadable.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!confirming ? (
              <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => setConfirming(true)}>
                Convert to NOMPANY_DATA_KEY
              </button>
            ) : (
              <>
                <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" disabled={running} onClick={run}>
                  {running ? "Converting…" : `Yes, convert these ${values} value${values === 1 ? "" : "s"}`}
                </button>
                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" disabled={running} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            )}
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" disabled={running} onClick={() => load()}>
              Check again
            </button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
