// MASTER DATA — the studio's own reference records.
//
// THE SECOND KIND ARRIVED, so this grew the tab strip its own header promised.
// Locations and Departments: a place the studio works from, and the org chart
// it works in. Both are reference data that several departments read and none
// of them owns, which is the whole membership rule for this screen.
//
// THE THIRD TAB IS NUMBERING, 08/09/2026. The blueprint puts currencies, units
// of measure, numbering series, cost codes, the industry taxonomy and the flow
// templates here; numbering is the first of those to arrive, because it had no
// home at all — nineteen call sites minted a reference from a hard-coded
// literal and a studio whose invoices have always been "SI" got "INV".
//
// STILL NOT A HUB. The rest either live in Studio settings already — moving a
// working screen is a visibility decision each time — or have no records yet,
// and a tab promising an empty registry reads as a finished feature.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import LocationsPanel from "@/components/studio2/LocationsPanel";
import DepartmentsPanel from "@/components/studio2/DepartmentsPanel";
import NumberingPanel from "@/components/studio2/NumberingPanel";
import { numberingDict } from "@/shared/studio/numbering";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub } from "@/components/studio2/ui";

export default function StudioMasterData({ slug }) {
  const locale = useStudioLocale();
  const tr = operationsDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("locations");
  // NUMBERING IS THE STUDIO'S, NOT MASTER DATA'S ROWS. It is stored on the
  // studio record beside `currency` and the approval chains, so it is read and
  // refused by the settings route rather than by the master-data endpoint the
  // other two tabs use — the same split Locations already has a note about.
  const [numbering, setNumbering] = useState(null);
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

  const loadNumbering = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings`, { cache: "no-store" });
    if (!res.ok) return;                       // the tab simply does not render
    const body = await res.json();
    // ON `studio`, not at the top level: `numbering` is a field of the studio
    // record, so it rides in `clean(studio)` beside `currency` and the approval
    // chains rather than being lifted out beside `canManage`.
    setNumbering({ rows: body.studio?.numbering || [], canManage: Boolean(body.canManage) });
  }, [slug]);

  const saveNumbering = useCallback(async (patch) => {
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    // THE SERVER'S REASON, VERBATIM. `numberingProblems` names which series and
    // what is wrong with it; replacing that with "couldn't save" here would
    // throw away the only thing that tells somebody what to change.
    if (!res.ok) return { error: body.error || "failed", detail: body.detail };
    await loadNumbering();
    return {};
  }, [slug, loadNumbering]);

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/departments`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(out.error || "failed"); return; }
    setDepts(out);
  }, [slug]);

  const loadAll = useCallback(async () => {
    await Promise.all([load(), loadDepartments(), loadNumbering()]);
  }, [load, loadDepartments]);

  useEffect(() => { loadAll(); }, [loadAll]);
  // Both tabs are Master data's own rows — `locations` and `departments` under
  // `administration-master` — even though the locations half is READ through
  // Operations' payload, for the reason the comment above `load` gives. Where a
  // screen fetches from is not where its records live, and this hook wants the
  // second.
  useLiveUpdates(slug, "administration-master", loadAll);

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
        "awaiting-migration": () => tr.departmentsAwaitingMigration,
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
        {[["locations", tr.locationsTab], ["departments", tr.departments], ["numbering", numberingDict(locale).tab]].map(([key, label]) => (
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
      ) : tab === "departments" ? (
        <>
          <div>
            <h2 className={h2}>{tr.departments}</h2>
            <p className={sub}>{tr.departmentsOrgChart}</p>
          </div>
          {!depts ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <DepartmentsPanel
              rows={depts.departments || []}
              awaitingMigration={Boolean(depts.awaitingMigration)}
              missing={depts.missing || []}
              // KEY AND NAME TOGETHER, from the route. `nav` was the wrong
              // source and not merely an awkward one: it is a { key: boolean }
              // map of what this viewer may open, so it carries no names and
              // mapping over it threw.
              sections={depts.sections || []}
              people={data.people || []}
              canManage={data.canManageLocations}
              canCreate={data.canCreateLocations}
              canDelete={data.canDeleteLocations}
              busy={busy}
              send={sendDepartment}
            />
          )}
        </>
      ) : tab === "numbering" ? (
        <>
          <div>
            <h2 className={h2}>{numberingDict(locale).tab}</h2>
          </div>
          {numbering && (
            <NumberingPanel
              rows={numbering.rows}
              canManage={numbering.canManage}
              locale={locale}
              onSave={saveNumbering}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
