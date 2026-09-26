"use client";

import { useState } from "react";
import { Badge, Button, Num } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";

// THE CONVERSATION ABOUT MONEY WITH ONE CUSTOMER, inside the studio dialog's
// Subscription panel (the owner, 26/09/2026):
//
//  - a transfer the owner says they sent → CONFIRM (records the payment, moves
//    the studio onto the plan it paid for, and issues the invoice with nompany's
//    details, in one act) or REJECT with a reason the owner is emailed;
//  - a refund the owner asked for → REFUNDED (records what went back, issues a
//    credit note against the invoice, optionally takes paid time back) or
//    DECLINED with a reason; and a refund nompany decides on its own;
//  - the invoices and credit notes issued, each a printable page, and payments
//    recorded without an invoice, each of which can be given one.
//
// Every act carries an id minted before it is sent (the claim's, or a fresh
// event id), so pressing a button twice is one payment, one refund, one paper.

const newId = () => (globalThis.crypto?.randomUUID?.() || `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
const dmy = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d || "")) ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");

const REFUSAL = {
  "no-base-currency": "Choose the base currency in Packages → Pricing settings first — payments are recorded in it.",
  answered: "Somebody already answered this.",
  "missing-reason": "Give the reason in a few words — the owner is emailed it.",
  "bad-periods": "Periods must be a whole number from 0 to 36.",
  "bad-amount": "Enter an amount above nought.",
  "over-refund": "That is more than is left to refund on this invoice.",
  "unknown-invoice": "That invoice isn't on this studio.",
  "seller-incomplete": "The payment was recorded, but no invoice was issued: nompany's name, address and tax number are missing in Payments.",
  complimentary: "This studio is complimentary. Take that off before recording a payment.",
};

const STATUS_TONE = { pending: "warning", confirmed: "success", refunded: "success", rejected: "danger", declined: "danger", withdrawn: "muted" };

export default function BillingClaimsPanel({ studioId, data, packages = [], tiers = [], onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(""); // which form is open: `confirm:<id>`, `reject:<id>`, `refund:<id>`, `decline:<id>`, `refund:new`
  const [form, setForm] = useState({});
  const [eventId, setEventId] = useState(newId);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const muted = "text-xs text-[var(--ad-muted-foreground)]";

  const claims = data.claims || [];
  const pending = claims.filter((c) => c.status === "pending");
  const answered = claims.filter((c) => c.status !== "pending");
  const invoices = (data.documents || []).filter((d) => d.kind === "invoice");
  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || id;

  async function act(action, body) {
    setBusy(true); setError(""); setNote("");
    const res = await fetch(`/api/super/billing/${studioId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(REFUSAL[out.error] || "That didn't save."); return; }
    if (out.invoiceProblem) setError(REFUSAL[out.invoiceProblem] || out.invoiceProblem);
    else if (out.documentNo) setNote(`Issued ${out.documentNo}.`);
    setOpen(""); setForm({}); setEventId(newId());
    await onChanged?.();
  }

  function startConfirm(c) {
    const p = c.plan;
    setForm({
      amount: String(c.amount), currency: c.currency, periods: "1", reference: c.bankReference || "",
      period: p?.cycle || "monthly", packageId: p?.packageId || "", categoryId: p?.categoryId || "", tierId: p?.tierId || "",
      issueInvoice: true,
    });
    setOpen(`confirm:${c.id}`);
  }

  function startRefund(c) {
    const inv = invoices.find((d) => d.number === (c?.invoiceNo || ""));
    setForm({
      invoiceNo: inv?.number || "", amount: inv ? String(Math.max(0, inv.total - (inv.credited || 0))) : "",
      currency: inv?.currency || "", periods: "0", reference: "", reason: "", creditNote: true,
    });
    setOpen(c ? `refund:${c.id}` : "refund:new");
  }

  const refundForm = (requestId) => (
    <div className="mt-2 space-y-2 rounded-md border p-3" style={{ borderColor: "var(--ad-border)" }}>
      {!requestId && (
        <SelectMenu className="ad-select" value={form.invoiceNo} aria-label="Invoice refunded" onChange={(v) => {
          const inv = invoices.find((d) => d.number === v);
          set({ invoiceNo: v, currency: inv?.currency || "", amount: inv ? String(Math.max(0, inv.total - (inv.credited || 0))) : form.amount });
        }}
          options={[{ value: "", label: "No invoice (no credit note)" }, ...invoices.map((d) => ({ value: d.number, label: `${d.number} — ${d.total} ${d.currency}` }))]} />
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr,5rem,6rem]">
        <input className="ad-input" type="number" min="0" step="any" placeholder="Amount refunded" value={form.amount} aria-label="Amount refunded" onChange={(e) => set({ amount: e.target.value })} />
        {/* An invoice's own currency, or the catalogue's — never typed (26/09/2026). */}
        <input className="ad-input" readOnly value={form.currency || data.baseCurrency || "—"} aria-label="Currency" />
        <input className="ad-input" type="number" min="0" max="36" value={form.periods} aria-label="Periods taken back" title="Paid periods taken back" onChange={(e) => set({ periods: e.target.value })} />
      </div>
      <input className="ad-input" placeholder="Bank reference of the refund" value={form.reference} aria-label="Refund bank reference" onChange={(e) => set({ reference: e.target.value })} />
      <input className="ad-input" placeholder="Reason (the owner is emailed it)" value={form.reason} aria-label="Refund reason" onChange={(e) => set({ reason: e.target.value })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.creditNote !== false} disabled={!form.invoiceNo} onChange={(e) => set({ creditNote: e.target.checked })} /> Issue a credit note against the invoice</label>
      <p className={muted}>Periods taken back: 0 leaves the studio paid as it is; 1 or more moves its paid-until date back that many {data.subscription?.period === "yearly" ? "years" : "months"}.</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => act("refund", { eventId, requestId, invoiceNo: form.invoiceNo, amount: Number(form.amount), currency: form.currency, periods: Number(form.periods) || 0, reference: form.reference, reason: form.reason, creditNote: form.creditNote !== false })}>Record the refund</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen("")}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {data.holdUntil && (
        <p className="rounded-md border p-2 text-sm" style={{ borderColor: "var(--ad-info)" }}>
          Held by a payment claim: the studio works fully until {new Date(data.holdUntil).toLocaleString("en-GB")}, whatever the ladder says.
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <span className="ad-label">Waiting for an answer</span>
          {pending.map((c) => (
            <div key={c.id} className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--ad-warning)", backgroundColor: "color-mix(in oklab, var(--ad-warning) 8%, transparent)" }}>
              {c.kind === "transfer" ? (
                <>
                  <p><span className="font-600">Says they sent </span><Num>{c.amount} {c.currency}</Num> on {dmy(c.sentOn)} <span className={muted}>(told us {new Date(c.at).toLocaleString("en-GB")})</span></p>
                  <p className={muted}>Bank reference: <span className="font-mono">{c.bankReference || "—"}</span>{c.payerName ? ` · from ${c.payerName}` : ""}{c.note ? ` · “${c.note}”` : ""}</p>
                  {c.plan && <p className={muted}>For {nameOf(packages, c.plan.packageId)}{c.plan.tierId ? ` + ${nameOf(tiers, c.plan.tierId)}` : ""}, {c.plan.cycle}, quoted {c.plan.total} {c.plan.currency}</p>}
                  {open === `confirm:${c.id}` ? (
                    <div className="mt-2 space-y-2 rounded-md border p-3" style={{ borderColor: "var(--ad-border)" }}>
                      <p className={muted}>What actually arrived. The plan comes from the owner&apos;s request; blank keeps the studio&apos;s current one.</p>
                      {/* THEY MAY HAVE SENT ANOTHER CURRENCY — a region prices in its own —
                          and the payment is recorded in the catalogue's, so the amount has
                          to be what that is worth in it, not the figure they typed. */}
                      {c.currency && data.baseCurrency && c.currency !== data.baseCurrency && (
                        <p className="text-sm" style={{ color: "var(--ad-warning)" }}>They say they sent {c.currency}; this is recorded in {data.baseCurrency}. Enter what arrived in {data.baseCurrency}.</p>
                      )}
                      <div className="grid gap-2 sm:grid-cols-[1fr,5rem,5rem]">
                        <input className="ad-input" type="number" min="0" step="any" value={form.amount} aria-label="Amount received" onChange={(e) => set({ amount: e.target.value })} />
                        <input className="ad-input" readOnly value={data.baseCurrency || "—"} aria-label="Currency" />
                        <input className="ad-input" type="number" min="1" max="36" value={form.periods} aria-label="Periods paid" title="Periods paid" onChange={(e) => set({ periods: e.target.value })} />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <SelectMenu className="ad-select" value={form.period} aria-label="Billing period" onChange={(v) => set({ period: v })}
                          options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} />
                        <input className="ad-input" placeholder="Bank reference" value={form.reference} aria-label="Bank reference" onChange={(e) => set({ reference: e.target.value })} />
                        <SelectMenu className="ad-select" value={form.packageId} aria-label="Package" onChange={(v) => set({ packageId: v, categoryId: "" })}
                          options={[{ value: "", label: "Package: keep current" }, ...packages.map((p) => ({ value: p.id, label: p.name }))]} />
                        {(packages.find((p) => p.id === form.packageId)?.categories || []).length > 0 && (
                          <SelectMenu className="ad-select" value={form.categoryId} aria-label="Band" onChange={(v) => set({ categoryId: v })}
                            options={[{ value: "", label: "Band: none (largest)" }, ...packages.find((p) => p.id === form.packageId).categories.map((b) => ({ value: b.id, label: b.label || `${b.minEmployees}–${b.maxEmployees}` }))]} />
                        )}
                        <SelectMenu className="ad-select" value={form.tierId} aria-label="Tier" onChange={(v) => set({ tierId: v })}
                          options={[{ value: "", label: "Tier: keep current" }, ...tiers.map((t) => ({ value: t.id, label: t.name }))]} />
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.issueInvoice !== false} onChange={(e) => set({ issueInvoice: e.target.checked })} /> Issue the invoice now, with nompany&apos;s details from Payments</label>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => act("confirm-transfer", { claimId: c.id, ...form, periods: Number(form.periods), amount: Number(form.amount) })}>Confirm — the money arrived</Button>
                        <Button size="sm" variant="ghost" onClick={() => setOpen("")}>Cancel</Button>
                      </div>
                    </div>
                  ) : open === `reject:${c.id}` ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input className="ad-input min-w-[16rem] flex-1" placeholder="Why (the owner is emailed this)" value={form.reason || ""} aria-label="Reason" onChange={(e) => set({ reason: e.target.value })} />
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("reject-transfer", { claimId: c.id, reason: form.reason })}>Reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpen("")}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => startConfirm(c)}>Confirm received…</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setForm({ reason: "" }); setOpen(`reject:${c.id}`); }}>Not received…</Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p><span className="font-600">Asks for a refund of </span><span className="font-mono">{c.invoiceNo}</span> <span className={muted}>({new Date(c.at).toLocaleString("en-GB")})</span></p>
                  <p className={muted}>“{c.reason}”</p>
                  {open === `refund:${c.id}` ? refundForm(c.id) : open === `decline:${c.id}` ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input className="ad-input min-w-[16rem] flex-1" placeholder="Why (the owner is emailed this)" value={form.reason || ""} aria-label="Reason" onChange={(e) => set({ reason: e.target.value })} />
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("decline-refund", { claimId: c.id, reason: form.reason })}>Decline</Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpen("")}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => startRefund(c)}>Refunded…</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setForm({ reason: "" }); setOpen(`decline:${c.id}`); }}>Decline…</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="ad-label">Invoices and credit notes</span>
          {open !== "refund:new" && <Button size="sm" variant="ghost" onClick={() => startRefund(null)}>Record a refund…</Button>}
        </div>
        {open === "refund:new" && refundForm("")}
        {(data.documents || []).length === 0 ? <p className={muted}>None issued yet.</p> : (
          <ul className="space-y-1 text-sm">
            {data.documents.map((d) => (
              <li key={d.number} className="flex flex-wrap items-center gap-x-2">
                <a className="font-mono underline" href={`/api/super/billing/${studioId}/documents/${encodeURIComponent(d.number)}`} target="_blank" rel="noreferrer">{d.number}</a>
                <span className={muted}>{d.kind === "credit-note" ? `credit note for ${d.creditsInvoice}` : "invoice"} · {dmy(d.issuedOn)}</span>
                <Num>{d.kind === "credit-note" ? "−" : ""}{d.total} {d.currency}</Num>
                {d.kind === "invoice" && d.credited > 0 && <span className={muted}>({d.credited} credited)</span>}
              </li>
            ))}
          </ul>
        )}
        {(data.uninvoiced || []).length > 0 && (
          <div className="mt-2">
            <span className={muted}>Payments without an invoice:</span>
            <ul className="space-y-1 text-sm">
              {data.uninvoiced.map((u) => (
                <li key={u.eventId} className="flex flex-wrap items-center gap-2">
                  <Num className={muted}>{new Date(u.at).toLocaleDateString("en-GB")}</Num>
                  <Num>{u.amount} {u.currency}</Num>
                  <Button size="sm" variant="ghost" disabled={busy || !(u.amount > 0)} onClick={() => act("issue-invoice", { eventId: u.eventId })}>Issue invoice</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {answered.length > 0 && (
        <div>
          <span className="ad-label">Answered</span>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {answered.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-2">
                <Badge tone={STATUS_TONE[c.status] || "muted"}>{c.status}</Badge>
                <span>{c.kind === "transfer" ? `Transfer ${c.amount} ${c.currency} sent ${dmy(c.sentOn)}` : `Refund of ${c.invoiceNo}`}</span>
                {c.answer?.documentNo && <span className={`${muted} font-mono`}>{c.answer.documentNo}</span>}
                {c.answer?.reason && <span className={muted}>{c.answer.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-[var(--ad-destructive-ink)]" role="alert">{error}</p>}
      {note && <p className="text-sm text-[var(--ad-muted-foreground)]">{note}</p>}
    </div>
  );
}
