"use client";

import { useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/lib/studioLinks";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const th = "pb-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "py-3 pe-3 align-middle";

const ORDER_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Ordered: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "Partly received": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const DN_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Issued: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const MOVE_TONE = {
  in: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  out: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  adjust: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const fmt = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "—");
const fmtAt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");
const num = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(Number(n) || 0);
const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

// INVENTORY. On-hand is summed from the movement ledger, so every number on this
// screen can be traced to the movements that produced it.
// `view` is the ACTIVE SUB-SECTION key. Inventory already had internal tabs,
// so each sub-section now selects one and the tab bar becomes redundant — the
// sidebar is the navigation. Registered Items and Stock Management are the two
// halves of what used to be one "stock" tab.
const VIEW_TO_TAB = {
  "inventory-stock": "stock",
  "inventory-items": "stock",
  "inventory-vendors": "vendors",
  "inventory-sheets": "orders",
  "inventory-awb": "deliveries",
};

export default function StudioInventory({ slug, view = "inventory" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(VIEW_TO_TAB[view] || "stock");
  // Navigating between sub-sections re-selects the matching tab.
  useEffect(() => { setTab(VIEW_TO_TAB[view] || "stock"); }, [view]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Inventory in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Stock, deliveries and orders change from the floor — stay current.
  useLiveUpdates(slug, "inventory", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/inventory/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Inventory…</p>;

  const { canManage, vendors, items, movements, orders, deliveries, projects, summary, vocabulary, nav } = data;

  // The parent section is a place of its own, like every other section: its own
  // dashboard rather than a redirect into whichever sub-section came first.
  if (view === "inventory") {
    return (
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Summary summary={summary} />
        <InventoryDashboard slug={slug} items={items} vendors={vendors} orders={orders} deliveries={deliveries} />
      </div>
    );
  }

  const tabs = [
    ["stock", `Stock (${items.length})`],
    ["vendors", `Vendors (${vendors.length})`],
    ["orders", `Orders (${orders.length})`],
    ["deliveries", `Deliveries (${deliveries.length})`],
    ["movements", "Movements"],
  ];

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <Summary summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {tabs.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>

      {tab === "stock" && <Stock items={items} vendors={vendors} units={vocabulary.units} canManage={canManage} busy={busy} send={send} />}
      {tab === "vendors" && <Vendors rows={vendors} canManage={canManage} busy={busy} send={send} />}
      {tab === "orders" && <Orders rows={orders} vendors={vendors} items={items} projects={projects} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />}
      {tab === "deliveries" && <Deliveries rows={deliveries} items={items} projects={projects} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />}
      {tab === "movements" && <Movements rows={movements} />}
    </div>
  );
}

function message(out) {
  if (out.error === "read-only") return "You have view-only access to Inventory.";
  if (out.error === "duplicate") return "That name is already in use.";
  if (out.error === "duplicate-sku") return "That SKU is already in use.";
  if (out.error === "in-use") {
    const bits = [];
    if (out.movements) bits.push(`${out.movements} stock ${out.movements === 1 ? "movement" : "movements"}`);
    if (out.items) bits.push(`${out.items} ${out.items === 1 ? "item" : "items"}`);
    if (out.orders) bits.push(`${out.orders} ${out.orders === 1 ? "order" : "orders"}`);
    if (out.deliveries) bits.push(`${out.deliveries} ${out.deliveries === 1 ? "delivery" : "deliveries"}`);
    return `Still referenced by ${bits.join(" and ")} — that history can't be erased.`;
  }
  if (out.error === "insufficient") {
    if (Array.isArray(out.short) && out.short.length) {
      return `Not enough stock: ${out.short.map((s) => `need ${num(s.needed)}, have ${num(s.have)}`).join("; ")}.`;
    }
    return `Not enough stock — you have ${num(out.have)} and asked for ${num(out.needed)}.`;
  }
  if (out.error === "over-receive") return `That's more than the order still expects (${num(out.remaining)} outstanding).`;
  if (out.error === "received-already") return "Goods have already been received against this order — cancel it instead.";
  if (out.error === "already-issued") return "That delivery has already been issued.";
  if (out.error === "derived-status") return "Received status follows the goods — record what arrived instead.";
  if (out.error === "not-ordered") return "Mark the order as Ordered before receiving against it.";
  if (out.error === "lines") return "Add at least one line with a quantity.";
  if (out.error === "vendor") return "Pick a vendor.";
  if (out.error === "project") return "Pick a project.";
  if (out.error === "nothing") return "Enter what actually arrived.";
  return "That didn't save.";
}

// The Inventory dashboard is deliberately empty of analytics for now — it
// exists so the parent section is a place rather than a redirect. The tiles are
// counts and a way into each sub-section.
function InventoryDashboard({ slug, items, vendors, orders, deliveries }) {
  const tiles = [
    { label: "Registered items", value: items.length, key: "inventory-items" },
    { label: "Stock management", value: "Open", key: "inventory-stock" },
    { label: "Vendors", value: vendors.length, key: "inventory-vendors" },
    { label: "Project sheets", value: orders.length, key: "inventory-sheets" },
    { label: "AWB tracking", value: deliveries.length, key: "inventory-awb" },
  ];
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">Inventory</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">An overview of this section. Nothing is reported here yet.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <a key={t.key} href={`/${slug}/${t.key}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
            <p className={label}>{t.label}</p>
            <p className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.value}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

// ---- summary ---------------------------------------------------------------
function Summary({ summary }) {
  const cells = [
    ["Items", num(summary.items), ""],
    ["Below reorder", num(summary.low), summary.low > 0 ? "text-amber-600 dark:text-amber-400" : ""],
    ["Stock value", money(summary.value), ""],
    ["Orders awaiting", num(summary.awaiting), ""],
  ];
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        {cells.map(([name, value, tone]) => (
          <div key={name}>
            <p className={`font-display text-3xl font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- stock -----------------------------------------------------------------
function Stock({ items, vendors, units, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);

  const fields = (row) => [
    { key: "name", label: "Name", required: true, value: row?.name || "" },
    { key: "sku", label: "SKU", value: row?.sku || "", placeholder: "auto" },
    { key: "unit", label: "Unit", value: row?.unit || units[0], options: units.map((u) => ({ value: u, text: u })) },
    { key: "category", label: "Category", value: row?.category || "" },
    { key: "vendorId", label: "Vendor", value: row?.vendorId || "",
      options: [{ value: "", text: "—" }, ...vendors.map((v) => ({ value: v.id, text: v.name }))] },
    { key: "reorderLevel", label: "Reorder level", type: "number", value: row?.reorderLevel || "" },
    { key: "unitCost", label: "Unit cost", type: "number", value: row?.unitCost || "" },
    { key: "notes", label: "Notes", area: true, value: row?.notes || "" },
  ];

  return (
    <>
      {canManage && !adding && !editing && !adjusting && <button className={btn} onClick={() => setAdding(true)}>Add item</button>}

      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit item" : "New item"} busy={busy} fields={fields(editing)}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("items", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {adjusting && (
        <SimpleForm
          title={`Adjust stock — ${adjusting.name}`}
          note={`On hand: ${num(adjusting.onHand)} ${adjusting.unit}. Enter a positive number to add, negative to remove.`}
          busy={busy}
          fields={[
            { key: "qty", label: "Quantity", type: "number", required: true, value: "" },
            { key: "reason", label: "Reason", value: "", placeholder: "e.g. stock-take correction" },
          ]}
          onCancel={() => setAdjusting(null)}
          onSave={async (v) => { if (await send("stock", "POST", { ...v, itemId: adjusting.id })) setAdjusting(null); }} />
      )}

      {items.length === 0 ? <Empty title="Nothing in stock yet" body="Add the things you buy and hold. Quantities come from receiving orders and issuing deliveries." /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Item", "Category", "Vendor", "On hand", "Reorder", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i >= 3 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className={td}>
                      <span className="font-mono text-xs text-slate-400">{i.sku}</span>
                      <span className="ms-2 font-600 text-slate-900 dark:text-white">{i.name}</span>
                      {i.low && <span className="ms-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">Low</span>}
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{i.category || "—"}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{i.vendorName || "—"}</td>
                    <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>{num(i.onHand)} <span className="text-xs font-400 text-slate-400">{i.unit}</span></td>
                    <td className={`${td} text-end text-slate-500 dark:text-slate-400`}>{i.reorderLevel > 0 ? num(i.reorderLevel) : "—"}</td>
                    <td className={`${td} text-end`}>
                      {canManage && (
                        <span className="flex flex-wrap justify-end gap-2">
                          <button className={btnGhost} onClick={() => setAdjusting(i)}>Adjust</button>
                          <button className={btnGhost} onClick={() => setEditing(i)}>Edit</button>
                          <button className={btnDanger} disabled={busy} onClick={() => send("items", "DELETE", { id: i.id })}>Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

// ---- vendors ---------------------------------------------------------------
function Vendors({ rows, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add vendor</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit vendor" : "New vendor"} busy={busy}
          fields={[
            { key: "name", label: "Name", required: true, value: editing?.name || "" },
            { key: "contactName", label: "Contact", value: editing?.contactName || "" },
            { key: "email", label: "Email", value: editing?.email || "" },
            { key: "phone", label: "Phone", value: editing?.phone || "" },
            { key: "notes", label: "Notes", area: true, value: editing?.notes || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("vendors", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title="No vendors yet" body="Vendors are who you buy from. Items and orders point at them." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-600 text-slate-900 dark:text-white">{v.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {[v.contactName, v.email, v.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(v)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("vendors", "DELETE", { id: v.id })}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- orders ----------------------------------------------------------------
function Orders({ rows, vendors, items, projects, slug, nav, canManage, busy, send }) {
  const [drafting, setDrafting] = useState(false);
  const [receiving, setReceiving] = useState(null);

  return (
    <>
      {canManage && !drafting && !receiving && (
        <button className={btn} onClick={() => setDrafting(true)} disabled={vendors.length === 0 || items.length === 0}>
          New order
        </button>
      )}
      {canManage && (vendors.length === 0 || items.length === 0) && !drafting && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Add a vendor and at least one item before ordering.</p>
      )}

      {drafting && (
        <LineForm title="New purchase order" busy={busy} items={items} priced
          extra={[
            { key: "vendorId", label: "Vendor", required: true, options: vendors.map((v) => ({ value: v.id, text: v.name })) },
            { key: "projectId", label: "For project", options: [{ value: "", text: "—" }, ...projects.map((p) => ({ value: p.id, text: p.number }))] },
            { key: "expectedAt", label: "Expected", type: "date" },
          ]}
          onCancel={() => setDrafting(false)}
          onSave={async (v) => { if (await send("orders", "POST", v)) setDrafting(false); }} />
      )}

      {receiving && (
        <Receive order={receiving} busy={busy} onCancel={() => setReceiving(null)}
          onSave={async (lines) => { if (await send("orders", "PUT", { id: receiving.id, receive: lines })) setReceiving(null); }} />
      )}

      {rows.length === 0 ? <Empty title="No orders yet" body="An order records what you asked a vendor for. Receiving against it is what brings stock in." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((o) => (
              <li key={o.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{o.reference}</span>
                      <span className="font-600 text-slate-900 dark:text-white">{o.vendorName}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${ORDER_TONE[o.status]}`}>{o.status}</span>
                      {o.projectNumber && (
                        <RecordLink href={linkIf(nav?.projects, linkToProject(slug, o.projectId))} title="Open the project">
                          {o.projectNumber}
                        </RecordLink>
                      )}
                    </div>
                    <ul className="mt-2 space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {o.lines.map((l) => (
                        <li key={l.itemId}>
                          {l.itemLabel} — {num(l.qty)}
                          {l.received > 0 && <span className="text-emerald-600 dark:text-emerald-400"> · {num(l.received)} received</span>}
                          {l.unitPrice > 0 && <span className="text-slate-400"> · {money(l.unitPrice)} each</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-slate-400">
                      Total {money(o.total)}{o.expectedAt ? ` · expected ${fmt(o.expectedAt)}` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {o.status === "Draft" && <button className={btn} disabled={busy} onClick={() => send("orders", "PUT", { id: o.id, status: "Ordered" })}>Mark ordered</button>}
                      {(o.status === "Ordered" || o.status === "Partly received") && (
                        <button className={btn} onClick={() => setReceiving(o)}>Receive</button>
                      )}
                      {o.status !== "Cancelled" && o.status !== "Received" && (
                        <button className={btnGhost} disabled={busy} onClick={() => send("orders", "PUT", { id: o.id, status: "Cancelled" })}>Cancel</button>
                      )}
                      {o.outstanding === o.lines.reduce((n, l) => n + l.qty, 0) && (
                        <button className={btnDanger} disabled={busy} onClick={() => send("orders", "DELETE", { id: o.id })}>Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Receive({ order, busy, onCancel, onSave }) {
  const outstanding = order.lines.filter((l) => l.qty - (l.received || 0) > 0);
  const [got, setGot] = useState(() => Object.fromEntries(outstanding.map((l) => [l.itemId, String(l.qty - (l.received || 0))])));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Receive against {order.reference}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record what actually arrived — this is what brings the stock in.</p>
      <div className="mt-4 space-y-3">
        {outstanding.map((l) => (
          <div key={l.itemId} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className={label}>{l.itemLabel}</label>
              <input type="number" className={input} value={got[l.itemId] ?? ""}
                onChange={(e) => setGot((g) => ({ ...g, [l.itemId]: e.target.value }))} />
            </div>
            <span className="pb-2 text-xs text-slate-400">{num(l.qty - (l.received || 0))} outstanding</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy}
          onClick={() => onSave(Object.entries(got).map(([itemId, qty]) => ({ itemId, qty: Number(qty) || 0 })).filter((l) => l.qty > 0))}>
          {busy ? "Recording…" : "Record receipt"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// ---- deliveries ------------------------------------------------------------
function Deliveries({ rows, items, projects, slug, nav, canManage, busy, send }) {
  const [drafting, setDrafting] = useState(false);

  return (
    <>
      {canManage && !drafting && (
        <button className={btn} onClick={() => setDrafting(true)} disabled={projects.length === 0 || items.length === 0}>
          New delivery note
        </button>
      )}
      {canManage && projects.length === 0 && !drafting && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Deliveries go out to a project — open one in Projects first.</p>
      )}

      {drafting && (
        <LineForm title="New delivery note" busy={busy} items={items}
          extra={[{ key: "projectId", label: "To project", required: true, options: projects.map((p) => ({ value: p.id, text: p.number })) }]}
          onCancel={() => setDrafting(false)}
          onSave={async (v) => { if (await send("deliveries", "POST", v)) setDrafting(false); }} />
      )}

      {rows.length === 0 ? <Empty title="Nothing delivered yet" body="A delivery note issues stock to a project. Issuing it is what takes the stock out." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((d) => (
              <li key={d.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{d.reference}</span>
                      <RecordLink href={linkIf(nav?.projects, linkToProject(slug, d.projectId))} title="Open the project">
                        {d.projectNumber || "project"}
                      </RecordLink>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${DN_TONE[d.status]}`}>{d.status}</span>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {d.lines.map((l) => <li key={l.itemId}>{l.itemLabel} — {num(l.qty)}</li>)}
                    </ul>
                    {d.status === "Issued" && (
                      <p className="mt-1 text-xs text-slate-400">
                        Issued {fmtAt(d.issuedAt)}{d.issuedByAlias ? ` by ${d.issuedByAlias}` : ""}
                      </p>
                    )}
                  </div>
                  {canManage && d.status === "Draft" && (
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} disabled={busy} onClick={() => send("deliveries", "PUT", { id: d.id })}>Issue</button>
                      <button className={btnDanger} disabled={busy} onClick={() => send("deliveries", "DELETE", { id: d.id })}>Delete</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- movements -------------------------------------------------------------
function Movements({ rows }) {
  if (rows.length === 0) return <Empty title="No stock movements yet" body="Every receipt, issue and adjustment is recorded here — this ledger is where on-hand quantities come from." />;
  return (
    <section className={panel}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {["When", "Item", "Movement", "Qty", "Reason", "By"].map((h, i) => (
                <th key={h} className={`${th} ${i === 3 ? "text-end" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{fmtAt(m.at)}</td>
                <td className={`${td} text-slate-900 dark:text-white`}>{m.itemLabel}</td>
                <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-600 ${MOVE_TONE[m.kind]}`}>{m.kind}</span></td>
                <td className={`${td} text-end font-600 text-slate-900 dark:text-white`}>
                  {m.kind === "out" ? "−" : m.kind === "adjust" && m.qty < 0 ? "" : "+"}{num(Math.abs(m.qty))}
                </td>
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{m.reason || "—"}</td>
                <td className={`${td} text-slate-500 dark:text-slate-400`}>{m.byAlias || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- shared bits -----------------------------------------------------------
function SimpleForm({ title, note, fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      {note && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{note}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.options ? (
              <select className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            ) : f.area ? (
              <textarea rows={2} className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <input type={f.type || "text"} className={input} placeholder={f.placeholder || ""} value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// Orders and delivery notes are the same shape — a header plus item lines — so
// they share one form. `priced` adds the unit-price column that only orders use.
function LineForm({ title, extra, items, priced, busy, onCancel, onSave }) {
  const [head, setHead] = useState(() => Object.fromEntries(extra.map((f) => [f.key, f.options ? (f.options[0]?.value ?? "") : ""])));
  const [lines, setLines] = useState([{ itemId: "", qty: "", unitPrice: "" }]);

  const setLine = (i, k, v) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, [k]: v } : l)));
  const filled = lines.filter((l) => l.itemId && Number(l.qty) > 0);
  const ready = extra.filter((f) => f.required).every((f) => head[f.key]) && filled.length > 0;

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {extra.map((f) => (
          <div key={f.key}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.options ? (
              <select className={input} value={head[f.key]} onChange={(e) => setHead((h) => ({ ...h, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            ) : (
              <input type={f.type || "text"} className={input} value={head[f.key]} onChange={(e) => setHead((h) => ({ ...h, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className={label}>Item</label>
              <select className={input} value={l.itemId} onChange={(e) => setLine(i, "itemId", e.target.value)}>
                <option value="">Choose…</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.sku} · {it.name}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className={label}>Qty</label>
              <input type="number" className={input} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} />
            </div>
            {priced && (
              <div className="w-32">
                <label className={label}>Unit price</label>
                <input type="number" className={input} value={l.unitPrice} onChange={(e) => setLine(i, "unitPrice", e.target.value)} />
              </div>
            )}
            {lines.length > 1 && (
              <button className={btnGhost} onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>Remove</button>
            )}
          </div>
        ))}
        <button className={btnGhost} onClick={() => setLines((ls) => [...ls, { itemId: "", qty: "", unitPrice: "" }])}>Add line</button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave({ ...head, lines: filled })}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}
