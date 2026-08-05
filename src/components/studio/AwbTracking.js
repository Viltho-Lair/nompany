"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { parseAwb } from "@/lib/awb";
import { resolveTrackUrl } from "@/lib/awbAirlinesSeed";
import { AWB_STATUS, statusLabel, isException } from "@/lib/awbStatus";
import { canManageSection } from "@/lib/sectionAccessConstants";

function fmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); } }

function StatusBadge({ code, delivered }) {
  if (!code) return <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">No updates</span>;
  const cls = delivered
    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
    : isException(code)
      ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300"
      : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${cls}`}>{code} · {statusLabel(code)}</span>;
}

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function AwbTracking() {
  const [airlines, setAirlines] = useState([]);
  const [me, setMe] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes, meRes, accRes] = await Promise.all([
        fetch("/api/awb/airlines", { cache: "no-store" }),
        fetch("/api/awb", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/section-access", { cache: "no-store" }),
      ]);
      if (aRes.status === 403) throw new Error("You don't have access to AWB Tracking.");
      setAirlines(aRes.ok ? await aRes.json() : []);
      setShipments(sRes.ok ? await sRes.json() : []);
      setMe((await meRes.json())?.user || null);
      setAccessMap(accRes.ok ? ((await accRes.json())?.access || {}) : {});
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const canManage = useMemo(() => canManageSection(me, "inventory-awb", accessMap), [me, accessMap]);
  const byPrefix = useMemo(() => Object.fromEntries(airlines.map((a) => [a.prefix, a])), [airlines]);

  const parsed = useMemo(() => parseAwb(raw), [raw]);
  const airline = parsed.prefix ? byPrefix[parsed.prefix] : null;
  const track = useMemo(() => (parsed.valid ? resolveTrackUrl(airline, parsed) : null), [airline, parsed]);
  const detail = useMemo(() => shipments.find((s) => s.id === detailId) || null, [shipments, detailId]);

  async function addShipment() {
    if (!parsed.valid) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/awb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ awbNumber: parsed.formatted }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not track this AWB");
      setRaw("");
      await load();
      setDetailId(data.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">AWB Tracking</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track air cargo by Air Waybill number. Enter an 11-digit AWB — the airline is identified from its 3-digit prefix.</p>
        </div>
        {canManage && (
          <button onClick={() => setManageOpen(true)} className={btnGhost}>
            <Icon name="gear" className="h-4 w-4" /> Manage airlines
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Search / identify */}
      <div className={card}>
        <label className={label} htmlFor="awb-input">Air Waybill number</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              id="awb-input"
              className={input}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="e.g. 176-12345675"
              inputMode="numeric"
              autoComplete="off"
            />
            {/* Live validation + airline identification */}
            <div className="mt-2 min-h-[1.5rem] text-sm">
              {parsed.digits.length === 0 ? (
                <span className="text-slate-400">Prefix · serial · check digit (mod-7).</span>
              ) : parsed.valid ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <Icon name="checkDouble" className="h-3.5 w-3.5" /> Valid AWB
                  </span>
                  <span className="font-600 text-slate-700 dark:text-slate-200">{parsed.formatted}</span>
                  {airline ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      {parsed.prefix} · {airline.name}{airline.iata ? ` (${airline.iata})` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Prefix {parsed.prefix} isn&apos;t in the registry — add it under “Manage airlines”.</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Icon name="close" className="h-3.5 w-3.5" /> {parsed.reason}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <button onClick={addShipment} disabled={!parsed.valid || busy} className={btnPrimary}>
                <Icon name="plus" className="h-4 w-4" /> Track shipment
              </button>
            )}
            {track ? (
              <a href={track.url} target="_blank" rel="noreferrer" className={btnGhost}>
                <Icon name="location" className="h-4 w-4" /> {track.direct ? "Airline site" : "Web search"}
              </a>
            ) : (
              <button className={btnGhost} disabled>
                <Icon name="location" className="h-4 w-4" /> Airline site
              </button>
            )}
          </div>
        </div>

        {parsed.valid && (
          <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-[#191921] dark:text-slate-400">
            {track?.direct
              ? `Opens ${airline?.name || "the airline"}'s official cargo-tracking page in a new tab.`
              : "No direct link is set for this carrier yet — opens a web search. An admin can paste the airline's exact tracking URL under “Manage airlines”."}
            {" "}Automated in-app shipment movement (via the aggregator) is coming in a later segment.
          </p>
        )}
      </div>

      {/* Tracked shipments */}
      <div className="mt-6">
        <h2 className="mb-3 font-display text-base font-700 text-slate-900 dark:text-white">Tracked shipments</h2>
        <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : shipments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No tracked shipments yet — enter an AWB above and press “Track shipment”.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                    <th className="px-5 py-3 text-start font-600">AWB</th>
                    <th className="px-5 py-3 text-start font-600">Airline</th>
                    <th className="px-5 py-3 text-start font-600">Route</th>
                    <th className="px-5 py-3 text-start font-600">Status</th>
                    <th className="px-5 py-3 text-start font-600">Updated</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]" onClick={() => setDetailId(s.id)}>
                      <td className="px-5 py-3 font-600 text-slate-800 dark:text-slate-100">{s.awbNumber}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.airlineName || `Prefix ${s.prefix}`}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.origin || "—"}{s.destination ? ` → ${s.destination}` : ""}</td>
                      <td className="px-5 py-3"><StatusBadge code={s.currentStatus} delivered={s.delivered} /></td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{s.currentStatusAt ? fmtDateTime(s.currentStatusAt) : "—"}</td>
                      <td className="px-5 py-3 text-end"><Icon name="open" className="inline h-4 w-4 text-brand-700 dark:text-brand-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{airlines.length} airline prefixes in the registry.</p>
      </div>

      {detail && (
        <ShipmentDetail shipment={detail} canManage={canManage} onClose={() => setDetailId(null)} onChanged={load} />
      )}

      {manageOpen && (
        <AirlinesManager airlines={airlines} onClose={() => setManageOpen(false)} onChanged={load} />
      )}
    </div>
  );
}

// Shipment detail + movement timeline, with manual milestone entry (pre-API).
function ShipmentDetail({ shipment, canManage, onClose, onChanged }) {
  const [code, setCode] = useState("RCS");
  const [station, setStation] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Timeline newest-first for display.
  const movements = [...(shipment.movements || [])].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  async function addMilestone() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/awb/${shipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-movement", code, station, flightNo, at: at ? new Date(at).toISOString() : undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not add milestone");
      setStation(""); setFlightNo(""); setAt("");
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function refresh() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/awb/${shipment.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function removeMilestone(mvId) {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/awb/${shipment.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-movement", movementId: mvId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not remove");
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function untrack() {
    if (!confirm(`Stop tracking AWB ${shipment.awbNumber}?`)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/awb/${shipment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not remove");
      await onChanged();
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{shipment.awbNumber}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{shipment.airlineName || `Prefix ${shipment.prefix}`}{shipment.origin ? ` · ${shipment.origin}${shipment.destination ? ` → ${shipment.destination}` : ""}` : ""}</p>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge code={shipment.currentStatus} delivered={shipment.delivered} />
          {canManage && (
            <button onClick={refresh} disabled={busy} className="inline-flex items-center gap-1 text-xs font-600 text-brand-700 hover:underline disabled:opacity-60 dark:text-brand-300">
              <Icon name="cloud" className="h-3.5 w-3.5" /> Refresh from aggregator
            </button>
          )}
          {shipment.lastPolledAt && <span className="text-[11px] text-slate-400">Last checked {fmtDateTime(shipment.lastPolledAt)}</span>}
        </div>

        {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}

        {/* Movement timeline */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Movement</p>
          {movements.length === 0 ? (
            <p className="text-sm text-slate-400">No movement recorded yet.</p>
          ) : (
            <ol className="relative space-y-3 border-s border-slate-200 ps-4 dark:border-white/10">
              {movements.map((m) => (
                <li key={m.id} className="relative">
                  <span className={`absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full ${m.code === "DLV" ? "bg-emerald-500" : isException(m.code) ? "bg-red-500" : "bg-brand-500"}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-600 text-slate-800 dark:text-slate-100">{m.code} · {m.label || statusLabel(m.code)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[m.station, m.flightNo].filter(Boolean).join(" · ") || "—"} · {fmtDateTime(m.at)}
                      </p>
                    </div>
                    {canManage && <button onClick={() => removeMilestone(m.id)} disabled={busy} className="text-slate-300 hover:text-red-500" title="Remove"><Icon name="close" className="h-3.5 w-3.5" /></button>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Manual milestone entry (until the aggregator feeds it automatically) */}
        {canManage && (
          <div className="rounded-xl border border-slate-100 p-3 dark:border-white/10">
            <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Add milestone</p>
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={code} onChange={(e) => setCode(e.target.value)}>
                {AWB_STATUS.map((s) => (<option key={s.code} value={s.code}>{s.code} · {s.label}</option>))}
              </select>
              <input className={input} value={station} onChange={(e) => setStation(e.target.value.toUpperCase())} placeholder="Station (e.g. RUH)" />
              <input className={input} value={flightNo} onChange={(e) => setFlightNo(e.target.value.toUpperCase())} placeholder="Flight (e.g. EK802)" />
              <input type="datetime-local" className={input} value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div className="mt-2 flex justify-between">
              <button onClick={untrack} disabled={busy} className="text-xs font-600 text-red-600 hover:underline dark:text-red-400">Stop tracking</button>
              <button onClick={addMilestone} disabled={busy} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> Add milestone</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin registry manager — add / edit / delete airline prefixes.
function AirlinesManager({ airlines, onClose, onChanged }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null); // {id?, prefix, name, iata, trackUrlTemplate, active}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return airlines
      .filter((a) => !q || `${a.prefix} ${a.name} ${a.iata}`.toLowerCase().includes(q))
      .sort((a, b) => (a.prefix || "").localeCompare(b.prefix || ""));
  }, [airlines, query]);

  async function save() {
    if (!form.prefix || form.prefix.replace(/\D/g, "").length !== 3) { setErr("Prefix must be 3 digits."); return; }
    if (!form.name.trim()) { setErr("Airline name is required."); return; }
    setBusy(true); setErr("");
    try {
      const url = form.id ? `/api/awb/airlines/${form.id}` : "/api/awb/airlines";
      const res = await fetch(url, { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setForm(null);
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(a) {
    if (!confirm(`Remove ${a.prefix} ${a.name}?`)) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/awb/airlines/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
      await onChanged();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Airline registry</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button>
        </div>

        {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}

        {form ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label}>Prefix (3 digits)</label><input className={input} value={form.prefix} onChange={(e) => setForm((s) => ({ ...s, prefix: e.target.value.replace(/\D/g, "").slice(0, 3) }))} /></div>
              <div><label className={label}>IATA code</label><input className={input} value={form.iata} onChange={(e) => setForm((s) => ({ ...s, iata: e.target.value.toUpperCase().slice(0, 3) }))} /></div>
              <div className="sm:col-span-2"><label className={label}>Airline name</label><input className={input} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
              <div className="sm:col-span-2"><label className={label}>Tracking URL template <span className="font-400 normal-case text-slate-400">(tokens {"{AWB} {PREFIX} {SERIAL}"})</span></label><input className={input} value={form.trackUrlTemplate} onChange={(e) => setForm((s) => ({ ...s, trackUrlTemplate: e.target.value }))} placeholder="https://airline.com/track?awb={SERIAL}" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <input className={input} placeholder="Search prefix, name or IATA…" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button onClick={() => setForm({ prefix: "", name: "", iata: "", trackUrlTemplate: "", active: true })} className={btnPrimary}><Icon name="plus" className="h-4 w-4" /> Add</button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:bg-[#191921] dark:text-slate-500">
                  <tr><th className="px-3 py-2 text-start font-600">Prefix</th><th className="px-3 py-2 text-start font-600">Airline</th><th className="px-3 py-2 text-start font-600">IATA</th><th className="px-3 py-2" /></tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-t border-slate-50 dark:border-white/5">
                      <td className="px-3 py-2 font-600 text-slate-800 dark:text-slate-100">{a.prefix}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{a.name}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{a.iata || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setForm({ id: a.id, prefix: a.prefix, name: a.name, iata: a.iata || "", trackUrlTemplate: a.trackUrlTemplate || "", active: a.active !== false })} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Edit"><Icon name="pencil" className="h-3.5 w-3.5" /></button>
                          <button onClick={() => remove(a)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Remove"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
