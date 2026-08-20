"use client";

import { useMemo, useState } from "react";
import { Card, CardHead, CardBody, Badge, Avatar, Icon, Num, toneBg, toneFg, toneInk } from "../../../_components/ui";
import SuperDataGrid from "@/components/super/SuperDataGrid";
import { ORDERS_COLUMNS, ORDERS_PAGE_SIZE, STATUS_TABS, STAGES, stageIndex, statusTone } from "./orders";

// The Orders screen, ALIVE.
//
// It arrived as a template mock: a search box that filtered nothing, six status
// tabs that were `<button>`s with hardcoded counts and no handler, and a detail
// panel pinned to `#ORD-7741` whichever row you looked at. Everything on screen
// implied state and none of it held any — the worst kind of placeholder, because
// it reads as working.
//
// Now: the tabs filter and their counts are DERIVED from the rows (so they can
// never disagree with the list beneath them), search matches reference, customer
// and email, and clicking a row moves the detail panel — including the timeline,
// which is computed from the order's status rather than drawn as five ticks.
//
// The rows are still fixture data. That is deliberate and it is the honest half
// of "mock": there is no orders service behind this screen yet, and inventing a
// fetch to a route that does not exist would be a worse lie than the tabs were.

const money = (n) => `$${n.toFixed(2)}`;

function Timeline({ order }) {
  const reached = stageIndex(order.status);
  const terminal = order.status === "Cancelled" || order.status === "Refunded";

  return (
    <ol className="relative space-y-5 ps-6">
      {/* The spine. `start-[7px]` centres it under the 16px markers in both
          directions — it used to be an ltr:/rtl: pair. */}
      <span
        className="absolute start-[7px] top-2 h-[calc(100%-16px)] w-px"
        style={{ backgroundColor: "var(--ad-border)" }}
        aria-hidden="true"
      />
      {STAGES.map((label, i) => {
        const done = i <= reached;
        return (
          <li key={label} className="relative">
            <span
              className="absolute -start-6 top-1 flex h-4 w-4 items-center justify-center rounded-full"
              style={{
                backgroundColor: done
                  ? terminal
                    ? toneFg(statusTone(order.status))
                    : "var(--ad-success)"
                  : "var(--ad-muted)",
              }}
            >
              {done ? (
                // A heavier stroke: a 1.7 check inside a 10px dot is a smudge.
                <Icon name="check" className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              ) : null}
            </span>
            <p className={`text-sm ${done ? "font-500" : "text-[var(--ad-muted-foreground)]"}`}>{label}</p>
            <Num className="mt-0.5 block text-xs text-[var(--ad-muted-foreground)]">
              {done ? order.stamps[i] || order.date : "—"}
            </Num>
          </li>
        );
      })}
      {terminal ? (
        <li className="relative">
          <span
            className="absolute -start-6 top-1 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ backgroundColor: toneFg(statusTone(order.status)) }}
          >
            <Icon name="x" className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
          <p className="text-sm font-500">{order.status}</p>
          <Num className="mt-0.5 block text-xs text-[var(--ad-muted-foreground)]">{order.date}</Num>
        </li>
      ) : null}
    </ol>
  );
}

export default function OrdersScreen({ orders }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");

  // Counts come from the rows, not from a constant beside them. The template's
  // tabs said "Delivered (13,486)" over a list of seven; a count that cannot be
  // wrong is worth more than a count that looks impressive.
  const counts = useMemo(() => {
    const map = { All: orders.length };
    for (const o of orders) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab !== "All" && o.status !== tab) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
      );
    });
  }, [orders, tab, query]);

  const selected = orders.find((o) => o.id === selectedId) || rows[0] || orders[0];

  const columns = useMemo(() => {
    const render = {
      id: {
        // A reference. Monospaced and tabular, so ORD-7739 and ORD-7741 line up
        // digit under digit down the column.
        renderCell: ({ row }) => <Num className="font-500 text-[var(--ad-primary)]">{row.id}</Num>,
      },
      customer: {
        renderCell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.customer} size={32} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-500">{row.customer}</span>
              <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{row.email}</span>
            </span>
          </span>
        ),
      },
      items: {
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) => <Num>{row.items}</Num>,
      },
      total: {
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row) => row.total,
        renderCell: ({ row }) => <Num className="font-500">{money(row.total)}</Num>,
      },
      payment: {
        renderCell: ({ row }) => <span className="text-[var(--ad-muted-foreground)]">{row.payment}</span>,
      },
      status: { renderCell: ({ row }) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
      date: {
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) => (
          <Num className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{row.date}</Num>
        ),
      },
    };
    return ORDERS_COLUMNS.map(({ skeleton, ...col }) => ({ ...col, ...(render[col.field] || {}) }));
  }, []);

  const vat = selected ? selected.total * (0.15 / 1.15) : 0;

  return (
    <>
      <div className="md:col-span-8">
        <Card className="overflow-hidden">
          <CardHead
            title="All Orders"
            sub={`${rows.length} shown`}
            action={
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)]"
                />
                <input
                  className="ad-input w-52 ps-9"
                  placeholder="Search orders…"
                  aria-label="Search orders"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            }
          />

          <div
            className="flex flex-wrap gap-1 border-b px-6 pb-3"
            style={{ borderColor: "var(--ad-border)" }}
            role="tablist"
            aria-label="Filter orders by status"
          >
            {STATUS_TABS.map((label) => {
              const active = tab === label;
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(label)}
                  className="rounded-lg px-3 py-1.5 text-xs font-500 transition-colors"
                  style={
                    active
                      ? { backgroundColor: toneBg("primary", 0.12), color: toneInk("primary") }
                      : { color: "var(--ad-muted-foreground)" }
                  }
                >
                  {label} <Num className="opacity-60">({(counts[label] || 0).toLocaleString()})</Num>
                </button>
              );
            })}
          </div>

          <SuperDataGrid
            rows={rows}
            columns={columns}
            pageSize={ORDERS_PAGE_SIZE}
            ariaLabel="Orders"
            emptyIcon="cart"
            emptyLabel={query ? `No order matches “${query}”.` : "No orders with that status."}
            onRowClick={({ row }) => setSelectedId(row.id)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </Card>
      </div>

      <div className="md:col-span-4">
        <Card className="h-full">
          {selected ? (
            <>
              <CardHead
                title={<Num>{selected.id}</Num>}
                sub={`${selected.customer} · ${selected.items} item${selected.items === 1 ? "" : "s"}`}
                action={<Badge tone={statusTone(selected.status)}>{selected.status}</Badge>}
              />
              <CardBody>
                <Timeline order={selected} />

                <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--ad-border)" }}>
                  <p className="text-xs font-600 uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                    Shipping address
                  </p>
                  <p className="mt-1.5 text-sm">{selected.customer}</p>
                  <p className="text-sm text-[var(--ad-muted-foreground)]">
                    {selected.address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </div>

                <dl className="mt-5 space-y-2.5 border-t pt-5 text-sm" style={{ borderColor: "var(--ad-border)" }}>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ad-muted-foreground)]">Subtotal</dt>
                    <Num as="dd">{money(selected.total - vat)}</Num>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ad-muted-foreground)]">VAT (15%)</dt>
                    <Num as="dd">{money(vat)}</Num>
                  </div>
                  <div className="flex justify-between text-base font-700">
                    <dt>Total</dt>
                    <Num as="dd">{money(selected.total)}</Num>
                  </div>
                </dl>

                <div className="mt-5 flex gap-2">
                  <button type="button" className="ad-btn ad-btn-outline flex-1">
                    Invoice
                  </button>
                  <button type="button" className="ad-btn ad-btn-primary flex-1">
                    Track
                  </button>
                </div>
              </CardBody>
            </>
          ) : null}
        </Card>
      </div>
    </>
  );
}
