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
// THE FOURTH IS UNITS, and it is the same defect one register along: `UNITS`
// was eight strings in Inventory and `createItem` silently replaced anything
// else with the first of them, so a merchant selling cement in bags got "pcs".
// Both tabs read and write the STUDIO record, which is why one fetch serves
// them — see loadSettings.
//
// STILL NOT A HUB. The rest either live in Studio settings already — moving a
// working screen is a visibility decision each time — or have no records yet,
// and a tab promising an empty registry reads as a finished feature.
"use client";
import { useCallback, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import nextDynamic from "next/dynamic";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import LocationsPanel from "@/components/studio2/LocationsPanel";
import DepartmentsPanel from "@/components/studio2/DepartmentsPanel";
// BEHIND A REAL LAZY BOUNDARY. These are SECONDARY TABS — nobody lands on
// them — and a static import from this client module would put them in the
// studio route's first load, which is what every tenant page waits for.
// `import()` from inside a client module is a runtime import the bundler
// cannot flatten; see HeavyScreens.jsx for why the same call in a Server
// Component defers nothing at all.
const NumberingPanel = nextDynamic(() => import("@/components/studio2/NumberingPanel"),
  { loading: () => <ScreenSkeleton /> });
const UnitsPanel = nextDynamic(() => import("@/components/studio2/UnitsPanel"),
  { loading: () => <ScreenSkeleton /> });
const CostCodesPanel = nextDynamic(() => import("@/components/studio2/CostCodesPanel"),
  { loading: () => <ScreenSkeleton /> });
const TaxonomyPanel = nextDynamic(() => import("@/components/studio2/TaxonomyPanel"),
  { loading: () => <ScreenSkeleton /> });
const NoticesPanel = nextDynamic(() => import("@/components/studio2/NoticesPanel"),
  { loading: () => <ScreenSkeleton /> });
const ApiKeysPanel = nextDynamic(() => import("@/components/studio2/ApiKeysPanel"),
  { loading: () => <ScreenSkeleton /> });
const ClientTagsPanel = nextDynamic(() => import("@/components/studio2/ClientTagsPanel"),
  { loading: () => <ScreenSkeleton /> });
const ItemCategoriesPanel = nextDynamic(() => import("@/components/studio2/ItemCategoriesPanel"),
  { loading: () => <ScreenSkeleton /> });
import { numberingDict } from "@/shared/studio/numbering";
import { unitsDict } from "@/shared/studio/units";
import { costCodesDict } from "@/shared/studio/costCodes";
import { taxonomyDict } from "@/shared/studio/taxonomy";
import { noticesDict } from "@/shared/studio/notices";
import { apiKeysDict } from "@/shared/studio/apiKeys";
import { clientTagsDict } from "@/shared/studio/clientTags";
import { itemCategoriesDict } from "@/shared/studio/itemCategories";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub } from "@/components/studio2/ui";
import { useReload } from "@/components/studio2/useReload";

// `initial` is the /operations body the studio page answered in its own render,
// so Locations paints at once. Only that read: the other tabs' registers are
// not in it, so they are still asked for on mount.
export default function StudioMasterData({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = operationsDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("locations");
  // NUMBERING IS THE STUDIO'S, NOT MASTER DATA'S ROWS. It is stored on the
  // studio record beside `currency` and the approval chains, so it is read and
  // refused by the settings route rather than by the master-data endpoint the
  // other two tabs use — the same split Locations already has a note about.
  const [numbering, setNumbering] = useState(null);
  const [clientTags, setClientTags] = useState(null);
  const [itemCategories, setItemCategories] = useState(null);
  const [units, setUnits] = useState(null);
  // ALSO A FIELD OF THE STUDIO RECORD, so it rides in the same fetch as
  // numbering and units rather than costing a third round trip.
  const [taxonomies, setTaxonomies] = useState(null);
  const [notices, setNotices] = useState(null);
  // ITS OWN READ, on its own route: keys are neither Master data's rows nor
  // a field of the studio record, and the register is gated on a right this
  // screen does not otherwise ask about.
  const [apiKeys, setApiKeys] = useState(null);
  // The departments register is its own read, on its own route, because it is
  // its own collection — the Operations payload assembles locations and knows
  // nothing about the org chart.
  const [depts, setDepts] = useState(null);
  // THE COST CODE LIBRARY IS MASTER DATA'S OWN COLLECTION, so it is its own
  // read on its own route — the departments shape rather than the numbering
  // one. Its payload carries the drift report, which is why it cannot be
  // folded into the settings fetch: that answer depends on a right this screen
  // does not otherwise ask about.
  const [library, setLibrary] = useState(null);

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

  // ONE FETCH FOR BOTH STUDIO-RECORD TABS. Numbering and units are fields of
  // the same record behind the same right, so two calls would be two answers
  // to one question and one more round trip on every open of this screen.
  const loadSettings = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings`, { cache: "no-store" });
    if (!res.ok) return;                       // the tabs simply do not render
    const body = await res.json();
    // ON `studio`, not at the top level: both are fields of the studio record,
    // so they ride in `clean(studio)` beside `currency` and the approval chains
    // rather than being lifted out beside `canManage`.
    const canManage = Boolean(body.canManage);
    setNumbering({ rows: body.studio?.numbering || [], canManage });
    setUnits({ rows: body.studio?.units || [], canManage });
    setTaxonomies({ rows: body.studio?.taxonomies || [], canManage });
    setNotices({ rows: body.studio?.noticeTemplates || [], canManage });
  }, [slug]);

  // ONE SAVER FOR BOTH, for the reason one loader serves both: the patch names
  // its own field, and a second copy of this would be free to handle the
  // server's refusal differently from the first.
  const saveSettings = useCallback(async (patch) => {
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    // THE SERVER'S REASON, VERBATIM. `numberingProblems` names which series and
    // what is wrong with it, and `unitProblems` names which unit; replacing
    // either with "couldn't save" here would throw away the only thing that
    // tells somebody what to change.
    if (!res.ok) return { error: body.error || "failed", detail: body.detail };
    await loadSettings();
    return {};
  }, [slug, loadSettings]);

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/departments`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(out.error || "failed"); return; }
    setDepts(out);
  }, [slug]);

  const loadLibrary = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/cost-codes`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return;                       // the tab simply does not render
    setLibrary(out);
  }, [slug]);

  const loadClientTags = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/client-tags`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return;                       // the tab simply does not render
    setClientTags(out.tags || []);
  }, [slug]);

  const loadItemCategories = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/item-categories`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return;                       // the tab simply does not render
    setItemCategories({ rows: out.categories || [], suggestions: out.suggestions || [] });
  }, [slug]);

  const loadApiKeys = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/administration/api-keys`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return;                       // the tab simply does not render
    setApiKeys(out);
  }, [slug]);

  const loadRest = useCallback(async () => {
    await Promise.all([
      loadDepartments(), loadSettings(), loadLibrary(), loadApiKeys(),
      loadClientTags(), loadItemCategories(),
    ]);
  }, [loadDepartments, loadSettings, loadLibrary, loadApiKeys, loadClientTags, loadItemCategories]);

  const loadAll = useCallback(async () => {
    await Promise.all([load(), loadRest()]);
  }, [load, loadRest]);

  // With Locations already on hand, mount asks only for what it did not bring.
  useReload(initial !== undefined ? loadRest : loadAll);
  // Both tabs are Master data's own rows — `locations` and `departments` under
  // `administration-master` — even though the locations half is READ through
  // Operations' payload, for the reason the comment above `load` gives. Where a
  // screen fetches from is not where its records live, and this hook wants the
  // second.
  useLiveUpdates(slug, "administration-master", loadAll);

  // ONE DOOR FOR THE TAG REGISTER. It answers `true` or `false` rather than
  // the row, because the panel only needs to know whether to close its form —
  // the list comes back through the live update the write triggers.
  const sendTag = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/client-tags`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out.ok) { setError(clientTagsDict(locale).refusal(out.error || "")); return false; }
    await loadClientTags();
    return true;
  }, [slug, locale, loadClientTags]);

  // ONE DOOR FOR THE CATEGORY REGISTER, the shape the tag register's uses: it
  // answers true or false, because the panel only needs to know whether to close
  // its form — the rows come back through the write's own live update.
  const sendCategory = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/item-categories`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out.ok) { setError(itemCategoriesDict(locale).refusal(out.error || "", out)); return false; }
    await loadItemCategories();
    return true;
  }, [slug, locale, loadItemCategories]);

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

  // THE LIBRARY'S WRITER. Its own, because it posts to its own route and reads
  // a refusal the other two do not: deleting a code a project has taken is
  // refused with the COUNT, so the message can offer retiring it instead.
  const sendCostCode = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/cost-codes`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // THE SERVER'S REASON, VERBATIM, when it gave one. `libraryProblems`
      // names which rule the code broke; replacing that with "couldn't save"
      // would throw away the only thing that says what to change.
      setError(out.error === "in-use"
        ? costCodesDict(locale).inUse(out.projects || 0)
        : (out.detail || out.error || "failed"));
      return false;
    }
    await loadLibrary();
    return true;
  }, [slug, loadLibrary, locale]);

  const sendApiKey = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/api-keys`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(out.detail || out.error || "failed"); return false; }
    await loadApiKeys();
    return true;
  }, [slug, loadApiKeys]);

  // ISSUING IS ITS OWN CALLER because it is the ONE response that carries the
  // key. `sendApiKey` throws the body away after refreshing; here the body is
  // the point, and it is handed straight to the dialog and never stored.
  const issueApiKey = useCallback(async (payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/administration/api-keys`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(out.detail || out.error || "failed"); return ""; }
    await loadApiKeys();
    return out.key || "";
  }, [slug, loadApiKeys]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingMasterData} />;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {/* The tab strip this file's header always said would arrive with the
          second register. Both tabs answer to administration.master, so there
          is no per-tab gate — what differs is the CRUD ladder inside each. */}
      <div role="tablist" aria-label={tr.masterData} className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        {[["locations", tr.locationsTab], ["departments", tr.departments], ["numbering", numberingDict(locale).tab], ["units", unitsDict(locale).tab], ["categories", taxonomyDict(locale).tab], ["cost-codes", costCodesDict(locale).tab], ["notices", noticesDict(locale).tab], ["api-keys", apiKeysDict(locale).tab], ["client-tags", clientTagsDict(locale).tab], ["item-categories", itemCategoriesDict(locale).tab]].map(([key, label]) => (
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
            slug={slug}
            rows={data.locations || []}
            kinds={data.vocabulary?.locationKinds || []}
            canManage={data.canManageLocations}
            canCreate={data.canCreateLocations}
            canDelete={data.canDeleteLocations}
            busy={busy}
            send={send}
          />
        </>
      ) : tab === "item-categories" ? (
        <>
          <div>
            <h2 className={h2}>{itemCategoriesDict(locale).tab}</h2>
          </div>
          {!itemCategories ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <ItemCategoriesPanel
              rows={itemCategories.rows}
              suggestions={itemCategories.suggestions}
              canManage={data.canManageLocations}
              canCreate={data.canCreateLocations}
              canDelete={data.canDeleteLocations}
              busy={busy}
              send={sendCategory}
            />
          )}
        </>
      ) : tab === "client-tags" ? (
        <>
          <div>
            <h2 className={h2}>{clientTagsDict(locale).tab}</h2>
          </div>
          {!clientTags ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <ClientTagsPanel
              rows={clientTags}
              canManage={data.canManageLocations}
              canCreate={data.canCreateLocations}
              canDelete={data.canDeleteLocations}
              busy={busy}
              send={sendTag}
            />
          )}
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
              onSave={saveSettings}
            />
          )}
        </>
      ) : tab === "categories" ? (
        <>
          <div>
            <h2 className={h2}>{taxonomyDict(locale).tab}</h2>
          </div>
          {taxonomies && (
            <TaxonomyPanel
              rows={taxonomies.rows}
              canManage={taxonomies.canManage}
              locale={locale}
              onSave={saveSettings}
            />
          )}
        </>
      ) : tab === "api-keys" ? (
        <>
          <div>
            <h2 className={h2}>{apiKeysDict(locale).tab}</h2>
          </div>
          {!apiKeys ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <ApiKeysPanel
              keys={apiKeys.keys || []}
              grantable={apiKeys.grantable || []}
              canManage={apiKeys.canManage}
              busy={busy}
              send={sendApiKey}
              issue={issueApiKey}
            />
          )}
        </>
      ) : tab === "notices" ? (
        <>
          <div>
            <h2 className={h2}>{noticesDict(locale).tab}</h2>
          </div>
          {notices && (
            <NoticesPanel
              rows={notices.rows}
              canManage={notices.canManage}
              locale={locale}
              onSave={saveSettings}
            />
          )}
        </>
      ) : tab === "cost-codes" ? (
        <>
          <div>
            <h2 className={h2}>{costCodesDict(locale).tab}</h2>
          </div>
          {!library ? <ScreenSkeleton loadingLabel={tr.loadingMasterData} /> : (
            <CostCodesPanel
              codes={library.codes || []}
              groups={library.groups || []}
              // NULL, NOT EMPTY, when the reader may not open the projects —
              // the server did not read them, so the block is absent rather
              // than showing a drift of nothing.
              drift={library.drift || null}
              canManage={library.canManage}
              canCreate={library.canCreate}
              canDelete={library.canDelete}
              busy={busy}
              send={sendCostCode}
            />
          )}
        </>
      ) : tab === "units" ? (
        <>
          <div>
            <h2 className={h2}>{unitsDict(locale).tab}</h2>
          </div>
          {units && (
            <UnitsPanel
              rows={units.rows}
              canManage={units.canManage}
              locale={locale}
              onSave={saveSettings}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
