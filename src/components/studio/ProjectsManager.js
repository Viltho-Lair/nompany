"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/studio/icons";
import EntityForm from "@/components/studio/EntityForm";
import { collectionSchemas } from "@/lib/adminSchemas";
import { confirmDialog } from "@/lib/appDialog";

const schema = collectionSchemas.projects;
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";

const SORT_COLUMNS = [
  { key: "title_en", label: "Title" },
  { key: "location_en", label: "Location" },
  { key: "year", label: "Year" },
  { key: "category", label: "Category" },
];

function SortHeader({ col, sort, onSort }) {
  const active = sort.key === col.key;
  return (
    <th className="px-5 py-3.5 text-start font-600">
      <button onClick={() => onSort(col.key)} className={`inline-flex items-center gap-1 transition-colors hover:text-brand-700 dark:hover:text-brand-300 ${active ? "text-brand-700 dark:text-brand-300" : ""}`}>
        {col.label}
        <Icon name={active ? (sort.dir === "asc" ? "chevronUp" : "chevronDown") : "chevronDown"} className={`h-3 w-3 ${active ? "" : "opacity-30"}`} />
      </button>
    </th>
  );
}

export default function ProjectsManager() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes, meRes] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
      ]);
      const all = pRes.ok ? await pRes.json() : [];
      const me = meRes.ok ? (await meRes.json())?.user : null;
      const tags = Array.isArray(me?.tags) ? me.tags : [];
      setIsAdmin(tags.includes("admin"));
      // Admins/Leaders see all projects; a project manager sees only their own.
      const seeAll = !me || tags.includes("admin") || tags.includes("Leader");
      setRows(seeAll ? all : all.filter((x) => x.ownerId === me.id));
      setServices(sRes.ok ? await sRes.json() : []);
      setError("");
      // Backfill: every project defaults to a 365-day support period. Silently
      // populate any legacy project that predates the field.
      const missing = all.filter((p) => p.supportPeriodDays == null);
      if (missing.length) {
        await Promise.all(
          missing.map((p) =>
            fetch(`/api/projects/${p.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ supportPeriodDays: 365 }),
            }).catch(() => {})
          )
        );
      }
    } catch (e) {
      setError(e.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const serviceName = useMemo(() => {
    const map = Object.fromEntries(services.map((s) => [s.id, s.title_en || "Untitled"]));
    return (id) => map[id] || id || "—";
  }, [services]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    const val = (r) => {
      if (sort.key === "category") return serviceName(r.category).toLowerCase();
      if (sort.key === "year") return Number(r.year) || 0;
      return String(r[sort.key] || "").toLowerCase();
    };
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [rows, sort, serviceName]);

  async function remove(p) {
    if (!(await confirmDialog({ title: "Delete project", message: `Delete "${p.title_en || "this project"}"? This cannot be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not delete the project.");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} {rows.length === 1 ? "project" : "projects"}</p>
        <button onClick={() => setCreating(true)} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Create project
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No projects yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  {SORT_COLUMNS.map((c) => (<SortHeader key={c.key} col={c} sort={sort} onSort={toggleSort} />))}
                  <th className="px-5 py-3.5 text-end font-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/studio/projects/list/${p.id}`)} className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-brand-500/5 dark:border-white/5 dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-8 w-8 shrink-0 rounded-md border border-slate-200 object-cover dark:border-white/10" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-white/5"><Icon name="projects" className="h-4 w-4" /></span>
                        )}
                        <span>{p.title_en || "Untitled"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.location_en || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.year || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{serviceName(p.category)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {isAdmin ? (
                          <button onClick={(e) => { e.stopPropagation(); remove(p); }} title="Delete project" aria-label="Delete project" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        ) : (
                          <Icon name="open" className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <EntityForm
          title="Create project"
          collection="projects"
          schema={schema}
          initial={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}
