"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RFQ_STATUSES } from "@/lib/rfqs";
import { TECHNICAL_TAG } from "@/lib/authConstants";
import { useLivePoll } from "@/lib/useLivePoll";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const STATUS_COLOR = {
  New: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  "In-review": "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Converted: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Rejected: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
};

// Carried read-only from the Sales ticket — only a Sales Leader can set it,
// so it's never editable from here.
const URGENCY_BADGE = {
  Low: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  Normal: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  High: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }

export default function RfqManager() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [convert, setConvert] = useState(null); // { rfq, number, handledBy }
  const [converting, setConverting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      if (rRes.status === 403) throw new Error("You need the Technical or admin tag.");
      setRows(await rRes.json());
      setUsers(await uRes.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  // Technical staff eligible to be "Handled by" — admins are excluded (they're
  // super-users, not a person work is assigned to).
  const technicalUsers = useMemo(() => users.filter((u) => Array.isArray(u.tags) && u.tags.includes(TECHNICAL_TAG) && !u.tags.includes("admin")), [users]);
  const nameOf = (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed" : "—");

  async function changeStatus(row, next) {
    if (next === row.status) return;
    try {
      const res = await fetch(`/api/rfqs/${row.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error("Update failed");
      await load();
    } catch (e) { setError(e.message); }
  }
  function openConvert(rfq) {
    // If a sibling RFQ from the same sales ticket was already converted, reuse
    // its quotation number (locked) — multiple RFQs on one ticket share one
    // quotation number. Handled-by is always a free pick.
    const sibling = rows.find((r) => r.id !== rfq.id && r.sourceTicketId === rfq.sourceTicketId && r.quotationNumber);
    setConvert({ rfq, number: sibling?.quotationNumber || "", numberLocked: !!sibling?.quotationNumber, handledBy: technicalUsers[0]?.id || "" });
  }

  async function doConvert() {
    if (!convert.number.trim() || !convert.handledBy) { setError("Number and Handled-by are required."); return; }
    setConverting(true); setError("");
    try {
      const res = await fetch(`/api/rfqs/${convert.rfq.id}/convert-to-quotation`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ number: convert.number.trim(), handledBy: convert.handledBy, description: convert.rfq.description }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      setConvert(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setConverting(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Requests-for-quotation sent by Sales. Convert to a Quotation once reviewed.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No RFQs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Reference</th>
                  <th className="px-5 py-3.5 text-start font-600">Client</th>
                  <th className="px-5 py-3.5 text-start font-600">Urgency</th>
                  <th className="px-5 py-3.5 text-start font-600">Description</th>
                  <th className="px-5 py-3.5 text-start font-600">Requested by</th>
                  <th className="px-5 py-3.5 text-start font-600">Status</th>
                  <th className="px-5 py-3.5 text-start font-600">Received</th>
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).map((r) => (
                  // "Unresolved" = a New RFQ awaiting Technical action (matches
                  // the sidebar's red badge). Left stripe sets it apart.
                  <tr key={r.id} className={`border-s-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03] ${r.status === "New" ? "border-s-amber-400 bg-amber-50/40 dark:border-s-amber-500/70 dark:bg-amber-500/[0.06]" : "border-s-transparent"}`}>
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">{r.reference}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{r.clientName || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[r.urgency] || URGENCY_BADGE.Normal}`}>
                        {r.urgency || "Normal"}
                      </span>
                    </td>
                    <td className="max-w-sm truncate px-5 py-3.5 text-slate-600 dark:text-slate-300" title={r.description}>{r.description || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{nameOf(r.requestedBy) !== "—" ? nameOf(r.requestedBy) : r.requestedByUserId}</td>
                    <td className="px-5 py-3.5">
                      <select value={r.status} onChange={(e) => changeStatus(r, e.target.value)} className={`rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-600 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] ${(STATUS_COLOR[r.status]||"").split(" ").filter(c=>c.startsWith("text-")||c.startsWith("dark:text-")).join(" ")}`}>
                        {/* "Converted" is set only by the Convert button, not chosen
                            manually. Still listed when the row already is Converted so
                            its current value renders. */}
                        {(r.status === "Converted" ? RFQ_STATUSES : RFQ_STATUSES.filter((s) => s !== "Converted")).map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openConvert(r)}
                          disabled={r.status === "Converted"}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {r.status === "Converted" ? "Converted" : "Convert →"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {convert && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">Convert RFQ to Quotation</h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{convert.rfq.reference} · {convert.rfq.clientName}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Quotation number <span className="text-red-500">*</span></label>
                <input
                  className={convert.numberLocked ? `${input} cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-[#14141c] dark:text-slate-400` : input}
                  value={convert.number}
                  readOnly={convert.numberLocked}
                  onChange={(e) => setConvert((s) => ({ ...s, number: e.target.value }))}
                  placeholder="Q-2026-0001"
                />
                {convert.numberLocked && (
                  <p className="mt-1 text-[11px] font-600 text-amber-600 dark:text-amber-400">
                    Reusing the quotation number from a previous RFQ on this same ticket.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Handled by <span className="text-red-500">*</span></label>
                <select className={input} value={convert.handledBy} onChange={(e) => setConvert((s) => ({ ...s, handledBy: e.target.value }))}>
                  <option value="">— select —</option>
                  {technicalUsers.map((u) => (<option key={u.id} value={u.id}>{u.fullName || u.userId}</option>))}
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A new Quotation will be created with lead = <span className="font-600">{convert.rfq.reference}</span> and the description copied from this RFQ.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConvert(null)} className={btnGhost}>Cancel</button>
              <button onClick={doConvert} disabled={converting} className={btnPrimary}>{converting ? "Converting…" : "Convert"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
