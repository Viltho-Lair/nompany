"use client";

import { useCallback, useState } from "react";
import { Card, CardHead, CardBody, Button, Badge } from "@/app/super/_components/ui";
import { useReload } from "@/components/studio2/useReload";

// /super → PAYMENTS — how customers pay nompany (the owner, 26/09/2026).
//
// PERMANENT, and the home of every payment method. Bank transfer is the only
// one today and stays one once online payment arrives; card is listed as coming
// later so the page shows where it will go. Beside the methods: nompany's own
// details as its invoices print them, where "a customer says they paid" is
// emailed, and how long such a claim holds the unpaid ladder.
//
// Bank details are ENCRYPTED AT REST (lib/data/paymentSettings) and opened for
// this screen alone and for an owner about to pay.

const METHOD_LABEL = { bankTransfer: "Bank transfer", card: "Card, Apple Pay and Google Pay" };
const blankAccount = () => ({ id: "", label: "", currency: "", bankName: "", accountName: "", iban: "", swift: "", bankAddress: "" });

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="ad-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--ad-muted-foreground)]">{hint}</span> : null}
    </label>
  );
}

export default function PaymentSettingsScreen() {
  const [s, setS] = useState(null);
  const [methods, setMethods] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/payment-settings", { cache: "no-store" });
    if (!res.ok) { setMsg("Couldn't load the payment settings."); return; }
    const d = await res.json();
    setS(d.settings);
    setMethods(d.methods || []);
  }, []);
  useReload(load);

  if (!s) return <p className="text-sm text-[var(--ad-muted-foreground)]">{msg || "Loading…"}</p>;

  const seller = (patch) => { setS((x) => ({ ...x, seller: { ...x.seller, ...patch } })); setMsg(""); };
  const bank = (patch) => { setS((x) => ({ ...x, methods: { ...x.methods, bankTransfer: { ...x.methods.bankTransfer, ...patch } } })); setMsg(""); };
  const account = (i, patch) => bank({ accounts: s.methods.bankTransfer.accounts.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/super/payment-settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg("That didn't save."); return; }
    setS(out.settings);
    setMsg("Saved.");
  }

  const bt = s.methods.bankTransfer;
  const sellerIncomplete = !s.seller.name || !s.seller.taxNumber || !s.seller.address;

  return (
    <div className="space-y-6">
      <Card>
        <CardHead title="Payment methods" sub="What a customer can pay with. Each method is set up here, now and later." />
        <CardBody>
          <ul className="space-y-2 text-sm">
            {methods.map((m) => (
              <li key={m.key} className="flex items-center gap-3">
                <span className="font-500">{METHOD_LABEL[m.key] || m.key}</span>
                {m.key === "bankTransfer"
                  ? <Badge tone={bt.enabled ? "success" : "muted"}>{bt.enabled ? "On" : "Off"}</Badge>
                  : <Badge tone="muted">{m.available ? "Off" : "Coming later"}</Badge>}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Bank transfer"
          sub="Shown to the owner when they choose a package and on their Billing page. Stored encrypted."
          action={(
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bt.enabled} onChange={(e) => bank({ enabled: e.target.checked })} />
              Offer bank transfer
            </label>
          )}
        />
        <CardBody className="space-y-4">
          {bt.accounts.length === 0 && <p className="text-sm text-[var(--ad-muted-foreground)]">No account yet. Customers are told to contact nompany until one is added.</p>}
          {bt.accounts.map((a, i) => (
            <fieldset key={a.id || `new-${i}`} className="rounded-md border p-3" style={{ borderColor: "var(--ad-border)" }}>
              <legend className="px-1 text-xs font-600">{a.label || `Account ${i + 1}`}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Label (console only)"><input className="ad-input" value={a.label} onChange={(e) => account(i, { label: e.target.value })} placeholder="Arab Bank — USD" /></Field>
                <Field label="Currency it takes" hint="Blank takes any currency. Customers see the account for their currency first."><input className="ad-input uppercase" maxLength={3} value={a.currency} onChange={(e) => account(i, { currency: e.target.value })} placeholder="USD" /></Field>
                <Field label="Account name"><input className="ad-input" value={a.accountName} onChange={(e) => account(i, { accountName: e.target.value })} /></Field>
                <Field label="IBAN"><input className="ad-input font-mono" value={a.iban} onChange={(e) => account(i, { iban: e.target.value })} /></Field>
                <Field label="SWIFT / BIC"><input className="ad-input font-mono uppercase" maxLength={11} value={a.swift} onChange={(e) => account(i, { swift: e.target.value })} /></Field>
                <Field label="Bank name"><input className="ad-input" value={a.bankName} onChange={(e) => account(i, { bankName: e.target.value })} /></Field>
                <div className="sm:col-span-3"><Field label="Bank address"><input className="ad-input" value={a.bankAddress} onChange={(e) => account(i, { bankAddress: e.target.value })} /></Field></div>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => bank({ accounts: bt.accounts.filter((_, j) => j !== i) })}>Remove this account</Button>
            </fieldset>
          ))}
          <Button size="sm" variant="outline" onClick={() => bank({ accounts: [...bt.accounts, blankAccount()] })}>Add an account</Button>
          <p className="text-xs text-[var(--ad-muted-foreground)]">An account needs at least its name and IBAN; one without them is not saved.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Instructions (English)" hint="Optional. Shown above the account details."><textarea className="ad-input" rows={3} value={bt.instructions} onChange={(e) => bank({ instructions: e.target.value })} /></Field>
            <Field label="Instructions (Arabic)"><textarea className="ad-input" dir="rtl" rows={3} value={bt.instructionsAr} onChange={(e) => bank({ instructionsAr: e.target.value })} /></Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="When a customer says they paid" sub="The bell always rings. An email goes too when an address is set." />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Email nompany at" hint="Payment claims and refund requests are emailed here."><input className="ad-input" type="email" value={s.notifyEmail} onChange={(e) => { setS((x) => ({ ...x, notifyEmail: e.target.value })); setMsg(""); }} /></Field>
          <Field label="Hold the unpaid ladder for (hours)" hint="While a claim is waiting, the studio keeps working for this long from when the owner told us, even if it would close or shut down. 0 holds nothing; at most 168.">
            <input className="ad-input" type="number" min="0" max="168" value={s.claimHoldHours} onChange={(e) => { setS((x) => ({ ...x, claimHoldHours: e.target.value })); setMsg(""); }} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="nompany on its invoices" sub="Printed on every invoice and credit note issued from now on; each one keeps the details it was issued with." action={sellerIncomplete ? <Badge tone="warning">Name, address and tax number are needed to issue invoices</Badge> : null} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Field label="Legal name"><input className="ad-input" value={s.seller.name} onChange={(e) => seller({ name: e.target.value })} /></Field>
          <Field label="Legal name (Arabic)"><input className="ad-input" dir="rtl" value={s.seller.nameAr} onChange={(e) => seller({ nameAr: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><textarea className="ad-input" rows={2} value={s.seller.address} onChange={(e) => seller({ address: e.target.value })} /></Field></div>
          <Field label="Tax number"><input className="ad-input" value={s.seller.taxNumber} onChange={(e) => seller({ taxNumber: e.target.value })} /></Field>
          <Field label="Country code"><input className="ad-input uppercase" maxLength={2} value={s.seller.country} onChange={(e) => seller({ country: e.target.value })} /></Field>
          <Field label="Billing email"><input className="ad-input" type="email" value={s.seller.email} onChange={(e) => seller({ email: e.target.value })} /></Field>
          <Field label="Phone"><input className="ad-input" value={s.seller.phone || ""} onChange={(e) => seller({ phone: e.target.value })} /></Field>
          <Field label="Invoice number prefix" hint="NMP gives NMP-2026-00001, and NMP-CN-2026-00001 for credit notes."><input className="ad-input uppercase" maxLength={8} value={s.seller.invoicePrefix} onChange={(e) => seller({ invoicePrefix: e.target.value })} /></Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        {msg && <span className="text-sm text-[var(--ad-muted-foreground)]">{msg}</span>}
        {s.updatedAt && <span className="text-xs text-[var(--ad-muted-foreground)]">Last saved {new Date(s.updatedAt).toLocaleString("en-GB")}</span>}
      </div>
    </div>
  );
}
