// THE PLACES THE STUDIO WORKS FROM — one panel, rendered by two screens.
//
// It lived inside StudioOperations while locations were Field Operations'. They
// are Administration's Master data now, and BOTH screens still show them: the
// rota because a dispatcher adding a site should not have to leave the rota,
// and Master data because that is where they live. Extracted rather than
// copied, so "one service, one route, one panel" holds all the way up.
//
// THREE GATES, NOT ONE. `canManage` used to answer for every button because a
// single right covered the whole screen. Master data takes the full CRUD
// ladder, so adding, editing and deleting are asked separately — a studio can
// let somebody correct an address without letting them delete a site a rota
// still points at. Each is the route's own answer, so a button is drawn only
// where the write would be accepted.
//
// A PLACE HAS A PIN NOW (shared/places). Three ways in — the device's own fix,
// a pin dropped on a map, a pasted link or typed pair — and one way out, the
// Navigate menu, which opens directions in Google Maps, Waze or Apple Maps.
// The map above the list shows every pinned place and appears only when there
// is one, so a studio that never pins anything never loads Google's script.
"use client";
import { useState } from "react";
import nextDynamic from "next/dynamic";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { Dialog, panel, btn, btnGhost, btnRow, Empty } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import NavigateMenu from "@/components/studio2/NavigateMenu";
import { placeCoordinates, parseCoordinates, isShortMapsLink, formatLatLng } from "@/shared/places";

// BEHIND A REAL LAZY BOUNDARY — `import()` from a client module, the
// HeavyScreens.jsx shape. Neither is needed until a pin exists or somebody asks
// to drop one, and `ssr: false` because a map has nothing to render on a server.
const PlacesMap = nextDynamic(() => import("@/components/studio2/PlacesMap"),
  { ssr: false, loading: () => <div className="skel h-[360px] w-full rounded-geex" /> });
const PinPicker = nextDynamic(() => import("@/components/studio2/PinPicker"),
  { ssr: false, loading: () => <div className="skel h-[280px] w-full rounded-xl" /> });

// Operations keeps its own copy for the permits list; this is the same string.
// A shared token would be better and is a sweep of its own — several screens
// define these locally.
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// A FIX WORSE THAN THIS IS SAID ALOUD. Indoors, a phone's fix drifts to tens or
// hundreds of metres, which is another building; the pin is kept (it may be
// all there is) and the person is told to step outside or drop it by hand.
const POOR_FIX_M = 50;

export default function LocationsPanel({ slug, rows, kinds, canManage, canCreate, canDelete, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const placed = rows.map((l) => ({ ...l, at: placeCoordinates(l) }));
  const pinned = placed.filter((l) => l.at);
  const close = () => { setAdding(false); setEditing(null); };

  return (
    <>
      {canCreate && <button className={btn} onClick={() => setAdding(true)}>{tr.addLocation}</button>}
      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editLocation : tr.newLocation}
          description={tr.placeWorkHappensSite}
          onClose={close}
        >
          <LocationForm
            slug={slug}
            editing={editing}
            kinds={kinds}
            around={pinned.filter((l) => l.id !== editing?.id).map((l) => l.at)}
            busy={busy}
            onCancel={close}
            onSave={async (v) => { if (await send("locations", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) close(); }}
          />
        </Dialog>
      )}

      {rows.length > 0 && (pinned.length > 0 ? (
        <section className={`${panel} p-0`}>
          <p className="px-6 pt-4 pb-3 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {tr.pinsOnMap(pinned.length, rows.length)}
          </p>
          <PlacesMap slug={slug} places={pinned} />
        </section>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noPinsYet}</p>
      ))}

      {rows.length === 0 ? <Empty title={tr.noLocationsYet} body={tr.locationsPlacesWorkHappens} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {placed.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{l.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{l.kind}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[l.address, l.city].filter(Boolean).join(", ") || tr.noAddress}
                    {l.mapUrl && (
                      <a href={l.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="ms-2 text-brand-700 hover:underline dark:text-brand-300">{tr.mapLink}</a>
                    )}
                  </p>
                  {/* A pair reads left to right in both languages — it is a
                      number, not prose — so it is isolated as LTR. */}
                  <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                    {l.at ? <span dir="ltr">{formatLatLng(l.at)}</span> : tr.noPin}
                  </p>
                  {l.directions && <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">{l.directions}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {l.at && <NavigateMenu at={l.at} className={btnGhost} />}
                  {canManage && <button className={btnGhost} onClick={() => setEditing(l)}>{tr.edit}</button>}
                  {/* DELETE IS ITS OWN RIGHT. A rota or a permit pointing at
                      this place makes the route refuse with the counts, so
                      the danger button is honest about being refusable. */}
                  {canDelete && <button className={btnDanger} disabled={busy} onClick={() => send("locations", "DELETE", { id: l.id })}>{tr.delete}</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * The place's own form. It replaced a generic field-list form whose only
 * caller was this panel: a pin is not a text field — it has a source, an
 * accuracy, a map — and bending the generic form to carry those would have
 * been a special case inside something pretending to be general.
 */
function LocationForm({ slug, editing, kinds, around, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const start = placeCoordinates(editing);
  const [v, setV] = useState(() => ({
    name: editing?.name || "",
    kind: editing?.kind || kinds[0] || "",
    city: editing?.city || "",
    address: editing?.address || "",
    mapUrl: editing?.mapUrl || "",
    directions: editing?.directions || "",
    notes: editing?.notes || "",
  }));
  const [coords, setCoords] = useState(start ? formatLatLng(start) : "");
  const [source, setSource] = useState(start?.source || "typed");
  const [accuracy, setAccuracy] = useState(start?.source === "gps" && Number.isFinite(editing?.accuracyM) ? editing.accuracyM : null);
  const [gps, setGps] = useState({ state: "idle", text: "" });
  const [picking, setPicking] = useState(false);
  const set = (k) => (val) => setV((x) => ({ ...x, [k]: val }));

  const parsed = parseCoordinates(coords);
  // THE SAME READING THE SERVER DOES — `geoPatch` stores exactly what this
  // parses — so a pair the field accepts is a pair the route accepts.
  const coordsError = coords.trim() && !parsed
    ? (isShortMapsLink(coords) ? tr.coordinatesShortLink : tr.coordinatesUnreadable)
    : "";
  const ready = v.name.trim() && !coordsError;

  const put = (p, how, acc = null) => { setCoords(formatLatLng(p)); setSource(how); setAccuracy(acc); };

  // A LINK PASTED INTO "MAP LINK" PLACES THE PIN when there is none yet — the
  // commonest way anybody has a location to hand is a link in a chat.
  const onMapUrl = (val) => {
    set("mapUrl")(val);
    if (!coords.trim()) { const p = parseCoordinates(val); if (p) put(p, "link"); }
  };
  const onCoords = (val) => {
    setCoords(val);
    setSource(/[a-z]/i.test(val) ? "link" : "typed");
    setAccuracy(null);
  };

  const locate = () => {
    if (!("geolocation" in navigator)) { setGps({ state: "error", text: tr.browserCantReport }); return; }
    if (!window.isSecureContext) { setGps({ state: "error", text: tr.needsSecureConnection }); return; }
    setGps({ state: "busy", text: tr.locating });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        put({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "gps", Math.round(pos.coords.accuracy));
        setGps({ state: "idle", text: "" });
      },
      (err) => setGps({
        state: "error",
        text: { 1: tr.permissionDenied, 2: tr.noFixAvailable, 3: tr.timedOutFix }[err.code] || tr.locationError,
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const coordsHint = gps.state === "busy" ? tr.locating
    : source === "gps" && accuracy != null && parsed
      ? (accuracy > POOR_FIX_M ? tr.accuracyPoor(accuracy) : tr.accuracyAbout(accuracy))
      : tr.coordinatesHint;

  const save = () => onSave({
    ...v,
    // EMPTY IS NULL, NOT ABSENT. The server reads "no pair" beside a link as
    // "the link's pin" and beside nothing as "clear it" — see geoPatch.
    lat: parsed ? parsed.lat : null,
    lng: parsed ? parsed.lng : null,
    geoSource: parsed ? source : null,
    accuracyM: parsed && source === "gps" ? accuracy : null,
  });

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} required value={v.name} onChange={set("name")} />
        <Field label={tr.kind} as="select" value={v.kind} onChange={set("kind")}
          options={kinds.map((k) => ({ value: k, label: k }))} />
        <Field label={tr.city} value={v.city} onChange={set("city")} />
        <Field label={tr.address} value={v.address} onChange={set("address")} />
        <Field label={tr.mapLink} value={v.mapUrl} onChange={onMapUrl} className="sm:col-span-2"
          hint={isShortMapsLink(v.mapUrl) && !coords.trim() ? tr.shortLinkReadOnSave : undefined} />
        <div className="sm:col-span-2">
          <Field label={tr.coordinates} value={coords} onChange={onCoords}
            hint={coordsHint} error={coordsError || (gps.state === "error" ? gps.text : "")}
            inputProps={{ dir: "ltr", inputMode: "decimal", autoComplete: "off" }} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btnRow} disabled={gps.state === "busy"} onClick={locate}>{tr.useMyLocation}</button>
            <button type="button" className={btnRow} onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
              {picking ? tr.closeMap : tr.pickOnMap}
            </button>
          </div>
          {picking && (
            <div className="mt-3">
              <PinPicker slug={slug} value={parsed} around={around} onPick={(p) => put(p, "pin")} />
            </div>
          )}
        </div>
        <Field label={tr.directions} as="textarea" value={v.directions} onChange={set("directions")}
          hint={tr.directionsHint} className="sm:col-span-2" />
        <Field label={tr.notes} as="textarea" value={v.notes} onChange={set("notes")} className="sm:col-span-2" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={save}>{busy ? tr.saving : tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </div>
  );
}
