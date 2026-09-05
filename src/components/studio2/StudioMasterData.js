// MASTER DATA — the studio's own reference records.
//
// THE SECOND KIND ARRIVED, so this grew the tab strip its own header promised.
// Locations and Departments: a place the studio works from, and the org chart
// it works in. Both are reference data that several departments read and none
// of them owns, which is the whole membership rule for this screen.
//
// STILL NOT A HUB. The blueprint also puts currencies, units of measure,
// numbering series, cost codes, the industry taxonomy and the flow templates
// here. Four of those exist and live in Studio settings — moving a working
// screen is a visibility decision each time — and two have no records at all
// yet, and a tab promising an empty registry reads as a finished feature.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import LocationsPanel from "@/components/studio2/LocationsPanel";
import DepartmentsPanel from "@/components/studio2/DepartmentsPanel";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub } from "@/components/studio2/ui";

export default function StudioMasterData({ slug }) {
  const tr = operationsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("locations");
  // The departments register is its own read, on its own route, because it is
  // its own collection — the Operations payload assembles locations and knows
  // nothing about the org chart.
  const [depts, setDepts] = useState(null);

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

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/departments`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(out.error || "failed"); return; }
    setDepts(out);
  }, [slug]);

  const loadAll = useCallback(async () => {
    await Promise.all([load(), loadDepartments()]);
  }, [load, loadDepartments]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useLiveUpdates(slug, loadAll);

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

  // THE DEPARTMENTS WRITER. Separate from `send` above because it posts to a
  // different route and reads a different refusal — the register refuses a
  // delete with the counts of who still stands in the department, the same
  // courtesy the locations route extends about rotas.
  const sendDepartment = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/departments`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const named = {
        "in-use": () => tr.departmentInUse(out.people || 0, out.children || 0),
        cycle: () => tr.departmentCycle,
        "too-deep": () => tr.departmentTooDeep,
        "duplicate-code": () => tr.duplicateCode,
      }[out.error];
      setError(named ? named() : (out.error || "failed"));
      return false;
    }
    await loadDepartments();
    return true;
  }, [slug, loadDepartments, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingMasterData} />;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {/* The tab strip this file's header always said would arrive with the
          second register. Both tabs answer to administration.master, so there
          is no per-tab gate — what differs is the CRUD ladder inside each. */}
      <div role="tablist" aria-label={tr.masterData} className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        {[["locations", tr.locationsTab], ["departments", tr.departments]].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 font-display text-sm font-600 transition-colors ${
              tab === key
                ? "border-brand-600 text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "locations" ? (
        <>
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
        </>
      ) : (
        <>
          <div>
            <h2 className={h2}>{tr.departments}</h2>
            <p className={sub}>{tr.departmentsOrgChart}</p>
          </div>
          {!depts ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <DepartmentsPanel
              rows={depts.departments || []}
              missing={depts.missing || []}
              sectionKeys={depts.sectionKeys || []}
              // THE NAMES COME FROM THE NAV the studio is already reading, so a
              // renamed section reads correctly here without a second list.
              sectionNames={Object.fromEntries((data.nav || []).map((n) => [n.key, n.name]))}
              people={data.people || []}
              canManage={data.canManageLocations}
              canCreate={data.canCreateLocations}
              canDelete={data.canDeleteLocations}
              busy={busy}
              send={sendDepartment}
            />
          )}
        </>
      )}
    </div>
  );
}
