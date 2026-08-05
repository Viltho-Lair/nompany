"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import EntityForm from "@/components/studio/EntityForm";
import { collectionSchemas } from "@/lib/adminSchemas";
import { confirmDialog } from "@/lib/appDialog";

const card = "rounded-geex border border-slate-200/70 bg-white p-5 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const gridCls = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

// Small square image tile with a name row (name left, edit + delete right).
function Tile({ img, name, children, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
      <div className="flex aspect-square items-center justify-center bg-slate-50 dark:bg-[#191921]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={name || ""} className="h-full w-full object-contain" />
        ) : (
          <Icon name="gallery" className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="min-w-0 truncate text-sm font-600 text-slate-800 dark:text-slate-100" title={name}>{name || "—"}</span>
        {(onEdit || onDelete) && (
          <span className="flex shrink-0 items-center gap-1.5">
            {onEdit && <button onClick={onEdit} className={iconBtn} title="Edit" aria-label="Edit"><Icon name="pencil" className="h-3.5 w-3.5" /></button>}
            {onDelete && <button onClick={onDelete} className={`${iconBtn} hover:text-red-600`} title="Delete" aria-label="Delete"><Icon name="trash" className="h-3.5 w-3.5" /></button>}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function GalleryManager() {
  const [gallery, setGallery] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { collection, initial }
  const [projMode, setProjMode] = useState("categorized"); // "all" | "categorized"
  const [projQuery, setProjQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes, pRes] = await Promise.all([
        fetch("/api/galleryImages", { cache: "no-store" }),
        fetch("/api/signatures", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      setGallery(gRes.ok ? await gRes.json() : []);
      setSignatures(sRes.ok ? await sRes.json() : []);
      setProjects(pRes.ok ? await pRes.json() : []);
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(collection, id, label) {
    if (!(await confirmDialog({ title: `Delete ${label}`, message: `Delete this ${label}? This can't be undone.`, confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`/api/${collection}/${id}`, { method: "DELETE" });
    load();
  }

  async function toggle(id, field, value) {
    // optimistic
    setGallery((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    try {
      await fetch(`/api/galleryImages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    } catch { load(); }
  }

  // Project images uploaded via project profiles (project.gallery[]).
  const projImages = useMemo(() => {
    const q = projQuery.trim().toLowerCase();
    return projects
      .map((p) => ({ project: p, images: Array.isArray(p.gallery) ? p.gallery : [] }))
      .filter((g) => g.images.length)
      .filter((g) => !q || `${g.project.title_en || ""} ${g.project.projectNumber || ""}`.toLowerCase().includes(q));
  }, [projects, projQuery]);

  const allProjImages = useMemo(() => projImages.flatMap((g) => g.images.map((url, i) => ({ url, project: g.project, index: i + 1 }))), [projImages]);

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;

  const Toggle = ({ on, onClick, label }) => (
    <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-600 transition-colors ${on ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`} title={label}>
      <span className={`h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} />{label}
    </button>
  );

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Company signature icons */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Company Signature Icons</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Named signature images used on documents & quotes.</p>
          </div>
          <button onClick={() => setModal({ collection: "signatures", initial: null })} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white hover:bg-brand-950"><Icon name="plus" className="h-4 w-4" /> Add signature</button>
        </div>
        {signatures.length === 0 ? (
          <p className="text-sm text-slate-400">No signatures yet.</p>
        ) : (
          <div className={gridCls}>
            {signatures.map((s) => (
              <Tile key={s.id} img={s.image} name={s.name} onEdit={() => setModal({ collection: "signatures", initial: s })} onDelete={() => del("signatures", s.id, "signature")} />
            ))}
          </div>
        )}
      </section>

      {/* Showcase gallery images (uncategorized) */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Showcase Images</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Uncategorised images shown on the public site. Toggle website visibility & hero feature.</p>
          </div>
          <button onClick={() => setModal({ collection: "galleryImages", initial: null })} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white hover:bg-brand-950"><Icon name="plus" className="h-4 w-4" /> Add image</button>
        </div>
        {gallery.length === 0 ? (
          <p className="text-sm text-slate-400">No images yet.</p>
        ) : (
          <div className={gridCls}>
            {gallery.map((g) => (
              <Tile key={g.id} img={g.image} name={g.title_en || "Untitled"} onEdit={() => setModal({ collection: "galleryImages", initial: g })} onDelete={() => del("galleryImages", g.id, "image")}>
                <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                  <Toggle on={g.visible !== false} onClick={() => toggle(g.id, "visible", g.visible === false)} label="Shown" />
                  <Toggle on={!!g.heroFeatured} onClick={() => toggle(g.id, "heroFeatured", !g.heroFeatured)} label="In hero" />
                </div>
              </Tile>
            ))}
          </div>
        )}
      </section>

      {/* Project images (uploaded via project profiles) */}
      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Project Images</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Images uploaded from project profiles — view all, or browse by project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/15">
              {[["categorized", "By project"], ["all", "All"]].map(([v, l]) => (
                <button key={v} onClick={() => setProjMode(v)} className={`rounded-full px-3 py-1 text-sm font-600 transition-colors ${projMode === v ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>{l}</button>
              ))}
            </div>
            {projMode === "categorized" && (
              <input type="search" value={projQuery} onChange={(e) => setProjQuery(e.target.value)} placeholder="Search projects…" className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
            )}
          </div>
        </div>

        {projImages.length === 0 ? (
          <p className="text-sm text-slate-400">No project images{projQuery ? " match your search" : " yet"}.</p>
        ) : projMode === "all" ? (
          <div className={gridCls}>
            {allProjImages.map((im, i) => (
              <Tile key={`${im.project.id}-${i}`} img={im.url} name={`${im.project.title_en || "Project"} · #${im.index}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {projImages.map((g) => (
              <div key={g.project.id}>
                <p className="mb-2 text-sm font-600 text-slate-700 dark:text-slate-200">
                  {g.project.title_en || "Untitled"}
                  {g.project.projectNumber ? <span className="ms-1.5 text-xs font-500 text-slate-400">{g.project.projectNumber}</span> : null}
                </p>
                <div className={gridCls}>
                  {g.images.map((url, i) => (
                    <Tile key={i} img={url} name={`img #${i + 1}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && (
        <EntityForm
          title={`${modal.initial ? "Edit" : "Add"} ${modal.collection === "signatures" ? "signature" : "image"}`}
          collection={modal.collection}
          schema={collectionSchemas[modal.collection]}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
