"use client";

// WHO WE SPEAK TO AT A CLIENT, AND WHERE THE WORK IS — the contact and site
// block a deal is opened with. It belongs to no one department: `createTicket`
// (Sales) and `createQuotation` (Technical) take the SAME eight fields and hand
// them to the same `resolveClientFor`, which folds them onto the Client record.
// Sales asked for all eight and Technical asked for none, so an internal
// quotation created a client with no contact and no site while a ticket for the
// same client captured both — one form, not two, is the fix.
//
// EVERYTHING STORED ON THE CLIENT IS OFFERED BACK. A client's contacts and
// sites are kept on the client precisely so nobody retypes them: choosing a
// known contact fills the email, phone and position; choosing a saved site
// fills the country, city and map link. Both stay editable afterwards, so a
// person can be corrected without leaving the form. Without this the same
// contact gets typed a second time, slightly differently, and the client ends
// up with near-duplicates nothing will ever reconcile.
//
// THE COPY IS COMMON, not either department's. Two surfaces render this, and a
// dictionary module belongs to one surface — so its labels live in
// `shared/studio/common`, the way every other shared piece of chrome reads its
// words.

import { useMemo } from "react";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import Combo from "@/components/studio2/Combo";
import { useStudioLocale } from "@/components/studio2/locale";
import { commonDict } from "@/shared/studio/common";
import { COUNTRIES } from "@/shared/countries";
import { citiesFor } from "@/lib/cities";

const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);
// citiesFor keys on the ISO code while the answer people give is a NAME.
const codeOfCountry = (name) => COUNTRIES.find((c) => c.name === name)?.code || "";

const heading = "mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";

/**
 * @param value    the eight fields: contactName/Email/Phone/Position and
 *                 locationName/Country/City/Url.
 * @param onChange called with a PATCH, never the whole object, so a caller
 *                 holding these fields inside a larger form merges them.
 * @param client   the Client record the typed name resolved to, or null. Its
 *                 `contacts` and `locations` are what gets offered back.
 * @param positions contact positions the studio has vocabulary for. A free
 *                 Combo either way — the list only saves typing.
 * @param cities   the fallback city list, used until a country is chosen.
 */
export default function ClientBlock({ value: f, onChange, client, positions = [], cities = [] }) {
  const tr = commonDict(useStudioLocale());

  const knownContacts = useMemo(
    () => (client?.contacts || []).filter((c) => c.name),
    [client],
  );
  const knownSites = useMemo(
    () => (client?.locations || []).filter((l) => l.name),
    [client],
  );

  function pickContact(name) {
    const hit = knownContacts.find(
      (c) => String(c.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase(),
    );
    onChange(hit
      ? {
        contactName: name,
        contactEmail: hit.email || "",
        contactPhone: hit.phone || "",
        contactPosition: hit.position || f.contactPosition,
      }
      : { contactName: name });
  }

  function pickSite(name) {
    const saved = knownSites.find(
      (l) => String(l.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase(),
    );
    onChange(saved
      ? {
        locationName: name,
        locationCountry: saved.country || f.locationCountry,
        locationCity: saved.city || "",
        locationUrl: saved.url || "",
      }
      : { locationName: name });
  }

  return (
    <>
      <p className={heading}>{tr.contact}</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} filled={!!f.contactName}>
          {/* A plain input until the client is known: an empty Combo is a
              dropdown that never has anything in it. */}
          {knownContacts.length > 0
            ? <Combo value={f.contactName} onChange={pickContact}
                options={knownContacts.map((c) => c.name)} inputClassName={BARE_CONTROL} />
            : <input className={BARE_CONTROL} value={f.contactName}
                onChange={(e) => onChange({ contactName: e.target.value })} />}
        </Field>
        <Field label={tr.position} filled={!!f.contactPosition}>
          <Combo value={f.contactPosition} onChange={(v) => onChange({ contactPosition: v })}
            options={positions} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label={tr.email} type="email" value={f.contactEmail}
          onChange={(v) => onChange({ contactEmail: v })} />
        <Field label={tr.phone} value={f.contactPhone}
          onChange={(v) => onChange({ contactPhone: v })} />
      </div>

      <p className={heading}>{tr.location}</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <Field label={tr.siteName} filled={!!f.locationName}>
          <Combo value={f.locationName} onChange={pickSite}
            options={knownSites.map((l) => l.name)} inputClassName={BARE_CONTROL} />
        </Field>
        {/* Changing the country CLEARS the city: the old one belonged to the
            old country's list and would sit there looking chosen. */}
        <Field label={tr.country} filled={!!f.locationCountry}>
          <Combo value={f.locationCountry}
            onChange={(v) => onChange({ locationCountry: v, locationCity: "" })}
            options={COUNTRY_NAMES} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label={tr.city} filled={!!f.locationCity}>
          <Combo value={f.locationCity} onChange={(v) => onChange({ locationCity: v })}
            options={f.locationCountry ? citiesFor(codeOfCountry(f.locationCountry)) : cities}
            inputClassName={BARE_CONTROL} />
        </Field>
        <Field label={tr.mapLink} value={f.locationUrl}
          onChange={(v) => onChange({ locationUrl: v })} />
      </div>
    </>
  );
}

// The eight fields a form holds for this block, and the shape the two create
// endpoints read them back as. Kept beside the component so a caller cannot
// drift from what the server takes.
export const EMPTY_CLIENT_BLOCK = {
  contactName: "", contactEmail: "", contactPhone: "", contactPosition: "",
  locationName: "", locationCountry: "", locationCity: "", locationUrl: "",
};

export function clientBlockPayload(f) {
  return {
    contactName: f.contactName.trim(),
    contactEmail: f.contactEmail.trim(),
    contactPhone: f.contactPhone.trim(),
    contactPosition: f.contactPosition.trim(),
    location: {
      name: f.locationName.trim(),
      country: f.locationCountry.trim(),
      city: f.locationCity.trim(),
      url: f.locationUrl.trim(),
    },
  };
}
