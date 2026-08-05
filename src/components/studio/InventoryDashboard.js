"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import { fmtSAR } from "@/lib/format";

const card = "rounded-geex border border-slate-200/70 bg-white p-5 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";

const TILES = [
  { key: "vendors", label: "Vendors", icon: "vendors", tone: "text-brand-600 bg-brand-500/10 dark:text-brand-300 dark:bg-brand-500/15" },
  { key: "items", label: "Registered items", icon: "services", tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-500/15" },
  { key: "units", label: "Units in stock", icon: "projects", tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300 dark:bg-amber-500/15" },
  { key: "value", label: "Stock value", icon: "star", tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300 dark:bg-violet-500/15" },
];

const LINKS = [
  { href: "/studio/inventory/stock", label: "Stock Management", desc: "Serial-tracked quantities", icon: "projects" },
  { href: "/studio/inventory/vendors", label: "Vendors", desc: "Local & international suppliers", icon: "vendors" },
  { href: "/studio/inventory/items", label: "Registered Items", desc: "Catalogue by vendor", icon: "services" },
  { href: "/studio/inventory/sheets", label: "Project Sheets", desc: "Per-project item sheets & serials", icon: "applications" },
  { href: "/studio/inventory/tracking", label: "Tracking", desc: "Coming soon", icon: "external" },
];

export default function InventoryDashboard() {
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [vRes, iRes, sRes] = await Promise.all([
        fetch("/api/inventoryVendors", { cache: "no-store" }),
        fetch("/api/inventoryItems", { cache: "no-store" }),
        fetch("/api/inventoryStock", { cache: "no-store" }),
      ]);
      setVendors(vRes.ok ? await vRes.json() : []);
      setItems(iRes.ok ? await iRes.json() : []);
      setStock(sRes.ok ? await sRes.json() : []);
    } catch {
      /* keep prior values */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);

  const stats = useMemo(() => {
    const itemsById = Object.fromEntries(items.map((i) => [i.id, i]));
    let units = 0;
    let value = 0;
    for (const rec of stock) {
      const qty = Array.isArray(rec.serials) ? rec.serials.length : 0;
      units += qty;
      const price = Number(itemsById[rec.itemId]?.price);
      if (Number.isFinite(price)) value += price * qty;
    }
    return { vendors: vendors.length, items: items.length, units, value };
  }, [vendors, items, stock]);

  const display = {
    vendors: stats.vendors.toLocaleString("en-US"),
    items: stats.items.toLocaleString("en-US"),
    units: stats.units.toLocaleString("en-US"),
    value: fmtSAR(stats.value),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vendors, registered items and serial-tracked stock.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.key} className={card}>
            <div className="flex items-center justify-between">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${t.tone}`}>
                <Icon name={t.icon} className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-800 text-slate-900 dark:text-white">{loading ? "…" : display[t.key]}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">Sections</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${card} group flex items-center gap-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5`}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Icon name={l.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-700 text-slate-800 dark:text-slate-100">{l.label}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{l.desc}</span>
              </span>
              <Icon name="external" className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500 dark:text-slate-600" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
