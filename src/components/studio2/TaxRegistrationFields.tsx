"use client";

import { Field } from "@/components/fields/Field";
import { useStudioLocale } from "@/components/studio2/locale";
import { taxRegistrationDict } from "@/shared/studio/taxRegistration";
import type { ReactNode } from "react";
import type { TaxAddress, TaxRegistration } from "@/shared/taxRegistration";

// A CUSTOMER'S TAX REGISTRATION — the VAT number, the commercial registration
// and the registered address in its parts (shared/taxRegistration). One block
// on two screens: a client in Sales, where it is recorded once, and an invoice
// in Finance, where it is snapshotted and may be changed while a draft.
//
// `value` is the registration or null; `onChange` gets the whole object back,
// and the server's `cleanTaxRegistration` turns an all-blank one into null.

const EMPTY = { vatNumber: "", crn: "", address: { street: "", building: "", additional: "", district: "", city: "", postal: "" } };

export default function TaxRegistrationFields({ value, onChange, help, note, disabled = false }: {
  value: Partial<Omit<TaxRegistration, "address">> & { address?: Partial<TaxAddress> | null } | null | undefined;
  onChange: (next: TaxRegistration) => void;
  help?: ReactNode;
  note?: ReactNode;
  disabled?: boolean;
}) {
  const tr = taxRegistrationDict(useStudioLocale());
  const v: TaxRegistration = { ...EMPTY, ...(value || {}), address: { ...EMPTY.address, ...(value?.address || {}) } };
  const set = (patch: Partial<TaxRegistration>) => onChange({ ...v, ...patch });
  const setAddress = (patch: Partial<TaxAddress>) => onChange({ ...v, address: { ...v.address, ...patch } });
  return (
    <div className="mt-5">
      <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.title}</p>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{help || tr.help}</p>
      {note && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr.vatNumber} hint={tr.vatHint} value={v.vatNumber} disabled={disabled}
          inputProps={{ inputMode: "numeric" }} onChange={(x) => set({ vatNumber: x })} />
        <Field label={tr.crn} value={v.crn} disabled={disabled} onChange={(x) => set({ crn: x })} />
        <Field label={tr.street} value={v.address.street} disabled={disabled} onChange={(x) => setAddress({ street: x })} />
        <Field label={tr.building} value={v.address.building} disabled={disabled}
          inputProps={{ inputMode: "numeric" }} onChange={(x) => setAddress({ building: x })} />
        <Field label={tr.district} value={v.address.district} disabled={disabled} onChange={(x) => setAddress({ district: x })} />
        <Field label={tr.city} value={v.address.city} disabled={disabled} onChange={(x) => setAddress({ city: x })} />
        <Field label={tr.postal} value={v.address.postal} disabled={disabled}
          inputProps={{ inputMode: "numeric" }} onChange={(x) => setAddress({ postal: x })} />
        <Field label={tr.additional} value={v.address.additional} disabled={disabled}
          inputProps={{ inputMode: "numeric" }} onChange={(x) => setAddress({ additional: x })} />
      </div>
    </div>
  );
}
