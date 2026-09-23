"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardHead, CardBody, Table, Button, Badge } from "@/app/super/_components/ui";
import { useReload } from "@/components/studio2/useReload";
import SelectMenu from "@/components/fields/SelectMenu";
import { CURRENCIES_FROM_EXCHANGE_API } from "@/shared/currencies";
import { priceKey, regionalPrice, totalFor } from "@/shared/priceRegions";

// REGIONAL PRICING — where a package costs what (23/09/2026, the owner, after
// Steam). A region is a set of countries sharing one currency; every package,
// band and tier gets a price FIXED in that currency. A price nobody has fixed
// shows as a suggestion — the base price at today's rate and the region's
// price level, worked out by the same `regionalPrice` the public page uses, so
// this screen can never suggest a figure the site would not show.
//
// The prices here are what the public pricing page shows a visitor from that
// region and what the checkout will charge. The base list on the Packages and
// Tiers screens is what they are suggested FROM.

const CURRENCY_OPTIONS = CURRENCIES_FROM_EXCHANGE_API.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));

const input = "ad-input";
const label = "ad-label";
const muted = "text-sm text-[var(--ad-muted-foreground)]";

const REFUSALS = {
  taken: (b) => `${b.country} is already in ${b.region}. A country can be in one region only.`,
  "default-required": () => "One region must stay the default — mark another region as the default first.",
};

// Every price a region can hold, in the order the Packages and Tiers screens
// list them: a package's per-employee rate (or each band's), then each tier.
function priceRows(packages, tiers) {
  const rows = [];
  for (const p of packages) {
    if (p.type === "compound" && p.categories.length) {
      for (const c of p.categories) {
        rows.push({ key: priceKey.band(p.id, c.id), item: p.name, part: c.label || `${c.maxEmployees} employees`, base: c.costPerEmployee, max: c.maxEmployees, unit: "per employee", isPublic: p.isPublic });
      }
    } else {
      rows.push({ key: priceKey.package(p.id), item: p.name, part: "", base: p.costPerEmployee, max: p.maxEmployees, unit: "per employee", isPublic: p.isPublic });
    }
  }
  for (const t of tiers) rows.push({ key: priceKey.tier(t.id), item: t.name, part: "Tier", base: t.cost, max: 0, unit: "per month", isPublic: t.isPublic });
  return rows;
}

export default function PriceRegionsScreen() {
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/price-regions", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the regions."); return; }
    const d = await res.json();
    setData(d);
    setSelectedId((id) => (d.regions.some((r) => r.id === id) ? id : d.regions[0]?.id || ""));
  }, []);
  useReload(load);

  async function send(method, payload) {
    setError("");
    const res = await fetch("/api/super/price-regions", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError((REFUSALS[body.error] || (() => "That didn't save."))(body)); return null; }
    await load();
    return body;
  }

  if (!data) return <Card><CardBody><p className={muted}>{error || "Loading…"}</p></CardBody></Card>;

  const region = data.regions.find((r) => r.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHead
          title="Regions"
          sub={`Each region has one currency and its own prices. A country no region names is priced in the default region. Prices are before ${data.taxPercent}% tax.`}
          action={(
            <Button size="sm" onClick={async () => {
              const out = await send("POST", { name: "New region", currency: data.baseCurrency });
              if (out?.item) setSelectedId(out.item.id);
            }}>Add region</Button>
          )}
        />
        <CardBody full>
          <Table head={["Region", "Currency", "Countries", "Price level", ""]}>
            {data.regions.map((r) => (
              <tr key={r.id} onClick={() => setSelectedId(r.id)}
                className={`cursor-pointer ${r.id === selectedId ? "bg-[color-mix(in_oklab,var(--ad-primary)_8%,transparent)]" : ""}`}>
                <td className="font-500">{r.name}</td>
                <td>{r.currency}</td>
                <td className={muted}>{r.isDefault ? "Every other country" : r.countries.length > 6 ? `${r.countries.slice(0, 6).join(" ")} +${r.countries.length - 6}` : r.countries.join(" ") || "None yet"}</td>
                <td>{r.priceLevel}%</td>
                <td>{r.isDefault && <Badge tone="primary">Default</Badge>}</td>
              </tr>
            ))}
          </Table>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-[var(--ad-destructive-ink)]" role="alert">{error}</p>}

      {region && (
        <>
          <RegionForm key={`form-${region.id}-${region.updatedAt}`} region={region} onSave={(patch) => send("PUT", { id: region.id, ...patch })}
            onDelete={async () => { if (await send("DELETE", { id: region.id })) setSelectedId(""); }} />
          <PriceTable key={`prices-${region.id}-${region.updatedAt}`} region={region} data={data}
            onSave={(prices) => send("PUT", { id: region.id, prices })} />
        </>
      )}
    </div>
  );
}

function RegionForm({ region, onSave, onDelete }) {
  const [draft, setDraft] = useState({
    name: region.name, nameAr: region.nameAr, currency: region.currency,
    countries: region.countries.join(" "), priceLevel: region.priceLevel, isDefault: region.isDefault,
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Card>
      <CardHead title={region.name} sub="Who this region is and what currency it charges in." />
      <CardBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="rg-name">Name</label>
            <input id="rg-name" className={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="rg-name-ar">Name (Arabic)</label>
            <input id="rg-name-ar" className={input} dir="rtl" value={draft.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="rg-currency">Currency</label>
            <SelectMenu id="rg-currency" className={input} value={draft.currency} aria-label="Currency"
              onChange={(v) => set({ currency: v })}
              options={CURRENCY_OPTIONS} />
            <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">Changing it clears this region&apos;s fixed prices — they were amounts in the old currency.</p>
          </div>
          <div>
            <label className={label} htmlFor="rg-level">Price level</label>
            <div className="flex items-center gap-2">
              <input id="rg-level" className={input} type="number" min="1" max="500" value={draft.priceLevel} onChange={(e) => set({ priceLevel: e.target.value })} />
              <span className={muted}>%</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">Where suggestions start: 100 is the base price converted; 60 is a 40% regional discount. Fixed prices are not touched.</p>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="rg-countries">Countries</label>
            <textarea id="rg-countries" className={input} rows={2} value={draft.countries}
              placeholder="Two-letter codes, e.g. JO SA AE" onChange={(e) => set({ countries: e.target.value })} />
            <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">
              Two-letter country codes. A country can be in one region only. The default region also catches every country no region names.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
            Default region
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <Button disabled={busy} onClick={async () => { setBusy(true); await onSave(draft); setBusy(false); }}>{busy ? "Saving…" : "Save region"}</Button>
          {!region.isDefault && <Button variant="ghost" onClick={onDelete}>Delete region</Button>}
        </div>
      </CardBody>
    </Card>
  );
}

function PriceTable({ region, data, onSave }) {
  const rate = data.rates[region.currency] ?? null;
  const rows = useMemo(() => priceRows(data.packages, data.tiers), [data.packages, data.tiers]);
  // What is typed, per key. Starts as the fixed prices; an empty box means
  // "use the suggestion", and saving an emptied box removes the fixed price.
  const [typed, setTyped] = useState(() => Object.fromEntries(rows.map((r) => [r.key, region.prices[r.key] ?? ""])));
  const [busy, setBusy] = useState(false);

  const suggestion = (r) => regionalPrice({ region: { ...region, prices: {} }, key: r.key, baseAmount: r.base, rate });
  const changed = rows.filter((r) => String(typed[r.key] ?? "") !== String(region.prices[r.key] ?? ""));

  function fillSuggestions() {
    setTyped((t) => {
      const next = { ...t };
      for (const r of rows) {
        const s = suggestion(r);
        if (next[r.key] === "" && s) next[r.key] = s.amount;
      }
      return next;
    });
  }

  async function save() {
    setBusy(true);
    await onSave(Object.fromEntries(changed.map((r) => [r.key, typed[r.key] === "" ? null : Number(typed[r.key])])));
    setBusy(false);
  }

  return (
    <Card>
      <CardHead
        title={`Prices in ${region.currency}`}
        sub={rate === null
          ? `No exchange rate from ${data.baseCurrency} to ${region.currency} today, so nothing can be suggested — every price here has to be fixed by hand.`
          : `Base prices are in ${data.baseCurrency}. 1 ${data.baseCurrency} = ${Number(rate.toFixed(4))} ${region.currency} today${data.stale ? " (rates are out of date)" : ""}. An empty box uses the suggestion.`}
        action={(
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fillSuggestions} disabled={rate === null}>Fix all suggestions</Button>
            <Button size="sm" onClick={save} disabled={busy || changed.length === 0}>{busy ? "Saving…" : `Save prices${changed.length ? ` (${changed.length})` : ""}`}</Button>
          </div>
        )}
      />
      <CardBody full>
        {rows.length === 0 ? (
          <p className={`p-5 ${muted}`}>No packages or tiers yet — add them on the Packages and Tiers screens first.</p>
        ) : (
          <Table head={["Item", `Base (${data.baseCurrency})`, `Suggested (${region.currency})`, `Price (${region.currency})`, "Monthly total", ""]}>
            {rows.map((r) => {
              const s = suggestion(r);
              const value = typed[r.key];
              const effective = value === "" ? s?.amount ?? null : Number(value);
              return (
                <tr key={r.key}>
                  <td>
                    <span className="font-500">{r.item}</span>
                    {r.part && <span className={muted}> · {r.part}</span>}
                    {!r.isPublic && <span className={muted}> · not public</span>}
                    {r.unit && <div className="text-xs text-[var(--ad-muted-foreground)]">{r.unit}</div>}
                  </td>
                  <td className="num">{r.base}</td>
                  <td className="num">{s ? s.amount : "—"}</td>
                  <td>
                    <input className={`${input} max-w-[9rem]`} type="number" min="0" step="any" aria-label={`Price for ${r.item} ${r.part}`}
                      placeholder={s ? String(s.amount) : "Required"} value={value}
                      onChange={(e) => setTyped((t) => ({ ...t, [r.key]: e.target.value }))} />
                  </td>
                  <td className="num">{effective === null ? "—" : r.max > 0 ? totalFor(effective, r.max, region.currency) : effective}</td>
                  <td>{value !== "" ? <Badge tone="success">Fixed</Badge> : s ? <Badge tone="warning">Suggestion</Badge> : <Badge tone="danger">No price</Badge>}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
