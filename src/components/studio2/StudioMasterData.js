// MASTER DATA — the studio's own reference records.
//
// ONE TAB TODAY, AND THAT IS DELIBERATE. The blueprint puts currencies, units
// of measure, numbering series, cost codes, the industry taxonomy and the flow
// templates here too. Four of those already exist and live in Studio settings;
// moving a working screen is a visibility decision each time, so they come in
// their own change. The other two have no records at all yet, and a tab
// promising an empty registry reads as a finished feature — which is the dead
// capability this product keeps deleting.
//
// So the screen is Locations, and it says so rather than pretending to be a
// hub. When the second kind of master data arrives, this grows a tab strip.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import LocationsPanel from "@/components/studio2/LocationsPanel";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub } from "@/components/studio2/ui";

export default function StudioMasterData({ slug }) {
  const tr = operationsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // IT READS THE OPERATIONS PAYLOAD, and that is worth a sentence because it
  // looks wrong. Locations are Master data's rows, but the endpoint that
  // already assembles them alongside the rights to edit them is Operations' —
  // and duplicating that assembly here would be a second reader free to
  // disagree with the first about what a place is. What this screen does NOT
  // share is the writer: both screens post to administration/locations.
  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/operations`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(out.error || "failed"); return; }
    setData(out);
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/locations`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // The route refuses a delete with the COUNTS of what still points at the
      // place, so the message can say which rota to fix rather than just "no".
      setError(out.error === "in-use"
        ? tr.locationInUse(out.shifts || 0, out.permits || 0)
        : (out.error || "failed"));
      return false;
    }
    await load();
    return true;
  }, [slug, load, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingMasterData} />;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <div>
        <h2 className={h2}>{tr.locations}</h2>
        <p className={sub}>{tr.locationsPlacesWorkHappens}</p>
      </div>
      <LocationsPanel
        rows={data.locations || []}
        kinds={data.vocabulary?.locationKinds || []}
        canManage={data.canManageLocations}
        canCreate={data.canCreateLocations}
        canDelete={data.canDeleteLocations}
        busy={busy}
        send={send}
      />
    </div>
  );
}
