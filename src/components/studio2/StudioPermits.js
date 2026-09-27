"use client";

import { useCallback, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import { h2, sub } from "@/components/studio2/ui";
import PermitsPanel from "@/components/studio2/PermitsPanel";
import { operationsRefusal } from "@/components/studio2/operationsRefusal";

// QUALITY & HSE → PERMITS — the one permit register (tier 5).
//
// Field Operations' permits (a clock: valid dates, holders, a place) and
// Quality & HSE's engine permits (a workflow: Requested → Issued → Closed) were
// two registers for one kind of paper. This is the one: Field Operations' rows,
// moved by SCREEN to where permits belong, with the workflow added. The rows
// stay on the `field-service` root where every one was written — no migration.
//
// WATCHES `field-service`, the section the permits are WRITTEN under
// (invariant 14), not this section, which owns no collection.
//
// `initial` is the /quality/permits body the studio page answered in its own
// render, so the register paints at once; absent, it fetches on mount as before.
export default function StudioPermits({ slug, initial }) {
  const tr = operationsDict(useStudioLocale());
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/quality/permits`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(operationsRefusal(body, tr)); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useReload(load, initial);
  useLiveUpdates(slug, "field-service", load);

  // THE PANEL'S WRITER, against this register's route. True on success, so the
  // panel's dialogs close only when the server kept what was sent.
  const send = useCallback(async (path, method, body) => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/quality/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // A permit somebody else moved or removed: redraw the real state FIRST,
      // because a successful load clears the banner, and the refusal must be
      // what is left on screen.
      if (["transition", "already", "notfound", "closed"].includes(out.error)) await load();
      // IN WORDS, not the token: this printed "controlled" and "forbidden".
      setError(operationsRefusal(out, tr));
      return false;
    }
    setError("");
    await load();
    return true;
  }, [slug, tr, load]);

  if (!data) return error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : <RecordSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className={h2}>{tr.permitsTitle}</h2>
        <p className={sub}>{tr.permitsLead}</p>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <PermitsPanel
        rows={data.permits || []}
        locations={data.locations || []}
        people={data.people || []}
        projects={data.projects || []}
        types={data.types || []}
        windowDays={data.windowDays}
        slug={slug}
        nav={data.nav}
        rights={{ canCreate: Boolean(data.canCreate), canEdit: Boolean(data.canEdit), canDelete: Boolean(data.canDelete) }}
        busy={busy}
        send={send}
      />
    </div>
  );
}
