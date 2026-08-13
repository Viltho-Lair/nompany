"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

// The questionnaires home: everything authored in the console, newest first.
//
// Laid out like Typeform's workspace screen, MINUS the parts of it that are
// theirs rather than ours — no Contacts, Automations or Research Flow tabs, no
// Invite, no workspace tree or Private group, no response-limit meter and no
// assistant box. What is left is the thing itself: create, find, open.

const RAIL = "flex w-[220px] shrink-0 flex-col gap-4 border-e border-slate-200 bg-white p-4";
const BTN = "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-slate-700 disabled:opacity-60";
const GHOST = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100";

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
};

export default function QuestionnaireList() {
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/questionnaires", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load questionnaires."); setRows([]); return; }
    setRows((await res.json()).questionnaires || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor("");
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((r) => r.name.toLowerCase().includes(q) || (r.route || "").toLowerCase().includes(q));
  }, [rows, query]);

  async function send(payload, method = "POST", id = "") {
    setBusy(true); setError("");
    const url = id ? `/api/super/questionnaires/${id}` : "/api/super/questionnaires";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError("That didn't work."); return null; }
    await load();
    return out;
  }

  async function create() {
    const out = await send({ name: "New questionnaire" });
    if (out?.questionnaire) window.location.assign(`/super/questionnaires/${out.questionnaire.id}`);
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900">
      <aside className={RAIL}>
        <Link href="/super/dashboard/analytics" className="flex items-center gap-2 text-sm font-600 text-slate-500 hover:text-slate-900">
          <Chevron className="h-4 w-4 rotate-180" /> Console
        </Link>
        <button type="button" className={BTN} onClick={create} disabled={busy}>
          <span className="text-base leading-none">+</span> Create questionnaire
        </button>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-700">Questionnaires</h1>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {["list", "grid"].map((v) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-600 capitalize transition-colors ${
                  view === v ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>}

        {rows === null ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">
              {query ? `Nothing matches “${query}”.` : "No questionnaires yet. Create one to get started."}
            </p>
          </div>
        ) : view === "list" ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-600 uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 text-start font-600">Name</th>
                  <th className="px-3 py-3 text-start font-600">Route</th>
                  <th className="px-3 py-3 text-end font-600">Questions</th>
                  <th className="px-3 py-3 text-end font-600">Responses</th>
                  <th className="px-3 py-3 text-end font-600">Completed</th>
                  <th className="px-3 py-3 text-end font-600">Updated</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/super/questionnaires/${r.id}`} className="flex items-center gap-3 font-600 text-slate-900 hover:underline">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/90 text-xs font-700 text-white">
                          {r.name.slice(0, 1).toUpperCase()}
                        </span>
                        {r.name}
                      </Link>
                      {/* The id is the thing other code will reference, so it is
                          on screen rather than hidden in a menu. */}
                      <span className="ms-11 block font-mono text-[11px] text-slate-400">{r.id}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{r.route || <span className="text-slate-300">unattached</span>}</td>
                    <td className="px-3 py-3 text-end text-slate-600">{r.questions}</td>
                    <td className="px-3 py-3 text-end text-slate-600">{r.responses || "-"}</td>
                    <td className="px-3 py-3 text-end text-slate-600">{r.completed || "-"}</td>
                    <td className="px-3 py-3 text-end text-slate-500">{fmt(r.updatedAt)}</td>
                    <td className="relative px-3 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                      <button type="button" aria-label="Actions" className={GHOST}
                        onClick={() => setMenuFor(menuFor === r.id ? "" : r.id)}>···</button>
                      {menuFor === r.id && (
                        <div className="absolute end-3 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-start shadow-lg">
                          <Link href={`/super/questionnaires/${r.id}`} className="block px-3 py-2 text-sm hover:bg-slate-50">Open</Link>
                          <button type="button" className="block w-full px-3 py-2 text-start text-sm hover:bg-slate-50"
                            onClick={() => send({ duplicateOf: r.id })}>Duplicate</button>
                          <button type="button" className="block w-full px-3 py-2 text-start text-sm text-rose-600 hover:bg-rose-50"
                            onClick={() => send(null, "DELETE", r.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((r) => (
              <Link key={r.id} href={`/super/questionnaires/${r.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-400">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/90 text-sm font-700 text-white">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <p className="mt-3 truncate font-600">{r.name}</p>
                <p className="truncate font-mono text-[11px] text-slate-400">{r.id}</p>
                <p className="mt-2 text-xs text-slate-500">{r.questions} question{r.questions === 1 ? "" : "s"} · {fmt(r.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Search({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
    </svg>
  );
}
function Chevron({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
