// THE PIECES BOTH MAINTENANCE SCREENS DRAW — written once, because two copies
// of "how a machine reads when you may not open it" are two answers free to
// disagree.
//
// The data hook, the photo field, the people picker and the line that says
// which machine and where — with Navigate beside the place when it has a pin,
// the same menu Master data's locations use.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { maintenanceDict } from "@/shared/studio/maintenance";
import NavigateMenu from "@/components/studio2/NavigateMenu";
import { btnRow, microLabel } from "@/components/studio2/ui";
import { placeCoordinates } from "@/shared/places";

/**
 * ONE READ AND ONE WRITER. The LIVE WATCHES are the screens' own, written as
 * literals at each call site: tests/restructure.mjs reads every
 * `useLiveUpdates` key out of the source to prove something is written under
 * it, and a key passed through a variable is one it cannot check (invariant 14).
 */
export function useMaintenance(slug, path) {
  const tr = maintenanceDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/${path}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, path]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);

  // THE SERVER'S REFUSAL, IN WORDS. Every refusal is a token the service named;
  // one this dictionary has no sentence for is shown as the token rather than
  // replaced with "failed", which would throw away the only clue.
  // `to` is another route of the same module — time entries post to
  // maintenance/labour and are read back with the orders.
  const send = useCallback(async (method, payload, to = path) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/${to}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || "failed"); return false; }
    await reload();
    return true;
  }, [slug, path, reload, tr]);

  return { tr, data, error, busy, send, reload };
}

const PRIORITY_TONE = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  normal: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  low: "bg-slate-50 text-slate-500 dark:bg-white/[0.03] dark:text-slate-400",
};

export function Chip({ tone = PRIORITY_TONE.normal, children }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${tone}`}>{children}</span>;
}

export const priorityTone = (p) => PRIORITY_TONE[p] || PRIORITY_TONE.normal;

/**
 * WHICH MACHINE, AND WHERE — each in one of three states, because the server
 * says which: found, hidden from this reader, or deleted since. A blank would
 * read as "no machine" for all three.
 */
export function Links({ asset, location, tr }) {
  const at = location && location.name ? placeCoordinates(location) : null;
  const assetText = !asset ? null
    : asset.state === "found" ? asset.name
    : asset.state === "hidden" ? tr.assetHidden
    : tr.assetDeleted;
  const placeText = !location ? null : location.name || tr.locationDeleted;
  if (!assetText && !placeText) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
      {assetText && <span><span className="text-slate-400">{tr.asset}:</span> {assetText}</span>}
      {placeText && <span><span className="text-slate-400">{tr.location}:</span> {placeText}</span>}
      {at && <NavigateMenu at={at} />}
    </div>
  );
}

/**
 * THE PHOTOGRAPHS, AS THUMBNAILS THAT OPEN THE ORIGINAL. Served by the private
 * media route after a membership check, so a copied link is worth nothing to
 * somebody outside the studio.
 */
export function PhotoStrip({ photos = [], label, onRemove, removeLabel }) {
  if (!photos.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {photos.map((url, i) => (
        <li key={url} className="relative">
          <a href={url} target="_blank" rel="noreferrer"
            className="block h-20 w-28 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element --
                next/image cannot optimise a private streaming route: the
                optimiser fetches server-side without the reader's cookie, so
                every photograph would 404 (the site reports' finding). */}
            <img src={url} alt={label(i + 1)} loading="lazy" className="h-full w-full object-cover" />
          </a>
          {onRemove && (
            <button type="button" onClick={() => onRemove(url)}
              className="mt-1 text-xs text-rose-600 hover:underline dark:text-rose-300">{removeLabel}</button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * ADD A PHOTO — on a phone, straight from the camera (`capture`). Uploaded to
 * the studio's private media first; the record keeps only the path.
 */
export function PhotoField({ slug, photos, onChange, tr, reference = "" }) {
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const attach = async (file) => {
    if (!file) return;
    setUploading(true); setFailed(false);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slug", slug);
      const res = await fetch("/api/media?kind=private", { method: "POST", body });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.url) onChange([...photos, out.url]);
      else setFailed(true);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div>
      <p className={microLabel}>{tr.photos}</p>
      <PhotoStrip photos={photos} label={(n) => tr.photoAlt(reference, n)}
        onRemove={(u) => onChange(photos.filter((x) => x !== u))} removeLabel={tr.removePhoto} />
      <label className={`${btnRow} mt-2 inline-block cursor-pointer text-sm`}>
        {uploading ? tr.uploading : tr.addPhoto}
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={uploading}
          onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {failed && <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{tr.photoFailed}</p>}
    </div>
  );
}

/**
 * WHO DOES THE WORK — several people, so a set of toggles rather than a
 * dropdown. Ids go to the server, which checks each is a member of the studio.
 */
export function PeoplePicker({ people = [], value = [], onChange, label, hint }) {
  return (
    <fieldset>
      <legend className={microLabel}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => {
          const on = value.includes(p.id);
          return (
            <button type="button" key={p.id} aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== p.id) : [...value, p.id])}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${on
                ? "border-brand-600 bg-brand-50 font-600 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-200"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
              {p.alias || p.id}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </fieldset>
  );
}

/** A select's options for machines and places, with a blank to name none. */
export const pickOptions = (rows = [], none) => [
  { value: "", label: none },
  ...rows.map((r) => ({ value: r.id, label: r.name })),
];
