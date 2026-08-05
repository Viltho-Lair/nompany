"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import ImageField from "@/components/studio/ImageField";
import { clientContacts, clientLocations } from "@/lib/salesClients";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }

export default function SalesClients() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, uRes] = await Promise.all([
        fetch("/api/sales-clients", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      if (cRes.status === 403) throw new Error("You need the Sales or admin tag.");
      setRows(await cRes.json());
      setUsers(await uRes.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const nameOf = (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed" : "—");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (!q) return true;
        const contactsText = clientContacts(r).map((c) => `${c.name} ${c.email} ${c.phone}`).join(" ");
        return `${r.name} ${contactsText}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [rows, query]);

  async function saveClient() {
    if (!form.name.trim()) { setError("Client name is required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/sales-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          logo: form.logo || "",
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Clients added via Sales tickets. {filtered.length} of {rows.length}.
        </p>
        <button onClick={() => setForm({ name: "", logo: "", contactEmail: "", contactPhone: "" })} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Add client
        </button>
      </div>

      <div className="mb-5">
        <input type="search" placeholder="Search name, email or phone…" value={query} onChange={(e) => setQuery(e.target.value)} className={input} />
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{rows.length === 0 ? "No clients yet — create a ticket or add one here." : "No clients match that search."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-5 py-3.5 text-start font-600">Name</th>
                  <th className="px-5 py-3.5 text-start font-600">Contact</th>
                  <th className="px-5 py-3.5 text-start font-600">Location</th>
                  <th className="px-5 py-3.5 text-start font-600">Date added</th>
                  <th className="px-5 py-3.5 text-start font-600">Created by</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">{r.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {(() => {
                        const contacts = clientContacts(r);
                        if (contacts.length === 0) return <span className="text-slate-400">—</span>;
                        return (
                          <div className="flex flex-col gap-1.5 text-xs">
                            {contacts.map((c) => (
                              <div key={c.id}>
                                {c.position && <span className="me-1 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{c.position}</span>}
                                {c.name && <span className="font-600 text-slate-700 dark:text-slate-200">{c.name} · </span>}
                                <span>{c.email || "—"}</span>
                                {c.phone && <span className="text-slate-400"> · {c.phone}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {(() => {
                        const locs = clientLocations(r);
                        if (locs.length === 0) return <span className="text-slate-400">—</span>;
                        return (
                          <div className="flex flex-col gap-1.5 text-xs">
                            {locs.map((l) => (
                              <div key={l.id} className="flex items-center gap-1">
                                {l.name && <span className="font-600 text-slate-700 dark:text-slate-200">{l.name}</span>}
                                {l.city && <span className="text-slate-400">· {l.city}</span>}
                                {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="text-brand-700 dark:text-brand-300" title="Open location"><Icon name="location" className="h-3.5 w-3.5" /></a>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{nameOf(r.createdBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7">
            <h2 className="mb-5 font-display text-lg font-700 text-slate-900 dark:text-white">Add client</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Name <span className="text-red-500">*</span></label>
                <input className={input} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact email</label>
                <input type="email" className={input} value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact phone</label>
                <input type="tel" className={input} value={form.contactPhone} onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Logo <span className="font-400 normal-case text-slate-400">(shown on project pages)</span></label>
                <ImageField field={{ maxKB: 512 }} value={form.logo} onChange={(url) => setForm((s) => ({ ...s, logo: url }))} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={saveClient} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
