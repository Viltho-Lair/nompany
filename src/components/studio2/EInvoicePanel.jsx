"use client";

// E-INVOICING CREDENTIALS — Studio settings (22/09/2026).
//
// DRAWN ONLY WHERE THERE IS AN AUTHORITY TO REACH. The country's own definition
// says whether its invoices must be submitted (`rules.einvoice`); a country
// that requires nothing gets no panel rather than a disabled one, which is the
// same rule the Official values panel above it follows — a studio sees its own
// country's obligations and nothing else.
//
// THE SECRET IS WRITE-ONLY. The server answers whether one is SET, never what
// it is, so this screen has nothing to redact and nothing to leak into a
// screenshot. Saving with the box blank keeps the stored one; removing it is
// its own button, because silently erasing a credential and silently keeping
// one are both wrong and only one of them is recoverable.

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { settingsDict } from "@/shared/studio/settings";
import { Field } from "@/components/fields/Field";
import SelectMenu from "@/components/fields/SelectMenu";
import { btn, btnGhost } from "@/components/studio2/ui";

const INPUT = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15";
const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10";

export default function EInvoicePanel({ rules, settings, hasTaxNumber, canManage, busy, onSave }) {
  const tr = settingsDict(useStudioLocale());
  const [form, setForm] = useState({ clientId: "", secretKey: "", incomeSource: "", typeCode: "", endpoint: "" });
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState("");

  // A COUNTRY THAT REQUIRES NOTHING GETS NO PANEL.
  if (!rules) return null;

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setTouched(true); };
  const value = (k) => (form[k] !== "" ? form[k] : settings?.[k] || "");

  const save = async (extra = {}) => {
    const body = {
      clientId: value("clientId"),
      incomeSource: value("incomeSource"),
      typeCode: value("typeCode"),
      endpoint: value("endpoint"),
      // AN EMPTY SECRET IS NOT SENT AT ALL, so the server cannot read it as a
      // deletion. Clearing one says so explicitly.
      ...(form.secretKey ? { secretKey: form.secretKey } : {}),
      ...extra,
    };
    const out = await onSave({ einvoiceSettings: body });
    if (out?.error) { setNote(tr.refusal ? tr.refusal(out.error) : String(out.detail || out.error)); return; }
    setForm((f) => ({ ...f, secretKey: "" }));
    setTouched(false);
    setNote("");
  };

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-700 text-[var(--geex-ink)]">{tr.einvoice}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {tr.einvoiceLead(rules.authority, rules.system)}
      </p>
      {/* WHOSE CREDENTIALS THESE ARE, said on the screen rather than assumed.
          Somebody setting a studio up reasonably wonders whether nompany has
          registered on their behalf; it has not, and cannot. */}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.einvoiceYours}</p>
      <p className="mt-1 text-xs text-slate-400">{tr.einvoiceWhere}</p>

      {/* NOT VERIFIED, and the studio is told before it relies on this. */}
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        {tr.einvoiceUnverified}
      </p>
      {/* EVERY SUBMISSION CARRIES THE TIN, so a studio without one is told
          where to set it rather than finding out from a rejection. */}
      {!hasTaxNumber && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {tr.einvoiceNeedsTin}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={tr.einvoiceClientId} value={value("clientId")} disabled={!canManage}
          onChange={(v) => set({ clientId: v })} />
        <Field label={tr.einvoiceSecret} type="password" value={form.secretKey} disabled={!canManage}
          hint={settings?.hasSecret ? `${tr.einvoiceSecretSet} ${tr.einvoiceSecretHint}` : tr.einvoiceSecretHint}
          onChange={(v) => set({ secretKey: v })} />
        <Field label={tr.einvoiceIncomeSource} value={value("incomeSource")} disabled={!canManage}
          hint={tr.einvoiceIncomeSourceHint} onChange={(v) => set({ incomeSource: v })} />
        <div>
          <p className="mb-1 text-xs text-slate-400">{tr.einvoiceTypeCode}</p>
          <SelectMenu className={INPUT} value={value("typeCode")} aria-label={tr.einvoiceTypeCode}
            onChange={(v) => set({ typeCode: v })}
            options={[{ value: "", label: "—" },
              ...(settings?.typeCodes || []).map((c) => ({ value: c, label: c }))]} />
          <p className="mt-1 text-xs text-slate-400">{tr.einvoiceTypeCodeHint}</p>
        </div>
        <Field label={tr.einvoiceEndpoint} value={value("endpoint")} disabled={!canManage}
          hint={tr.einvoiceEndpointHint} onChange={(v) => set({ endpoint: v })} />
      </div>

      {note && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{note}</p>}

      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy || !touched} onClick={() => save()}>{tr.save}</button>
          {settings?.hasSecret && (
            <button type="button" className={btnGhost} disabled={busy}
              onClick={() => save({ clearSecret: true })}>{tr.einvoiceClearSecret}</button>
          )}
        </div>
      )}
    </section>
  );
}
