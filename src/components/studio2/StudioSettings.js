"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";

// Studio settings — the studio's own identity, reached from the sidebar where
// "My account" used to sit. The account itself is still one click away, behind
// the header avatar; this is the studio, which is a different thing entirely.
//
// The rows deliberately copy /account's Personal info: a grouped stack where
// each row is an icon slot, a label, the current value, and the whole row is the
// control. Somebody who has set their own picture already knows how this works.

// Same geometry as the account hub's stack: 20px outer corners, 4px inside, 2px
// between rows, 56px min-height.
const STACK = "flex flex-col gap-[2px]";
const ROW =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-white px-4 py-3 text-start dark:bg-[#20202c] first:rounded-t-[20px] last:rounded-b-[20px]";
const ROW_TAP = "transition-colors hover:bg-slate-50 dark:hover:bg-white/5";
const ROW_LABEL = "text-base font-500 leading-normal text-slate-900 dark:text-white";
const ROW_VALUE = "truncate text-sm leading-[1.4286] text-slate-500 dark:text-slate-400";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

export default function StudioSettings({ slug }) {
  const [studio, setStudio] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setStudio(d.studio);
      setCanManage(Boolean(d.canManage));
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading settings…</p>;
  if (!studio) return <p className={BANNER_BAD}>We couldn&apos;t load this studio&apos;s settings.</p>;

  return (
    <div className="mx-auto w-full max-w-[640px] py-2">
      <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">Studio settings</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        How {studio.name} appears to everyone working in it.
        {!canManage && " Only an admin can change these."}
      </p>

      <div className={`${STACK} mt-4`}>
        {/* Logo: icon on the left, the logo itself at the RIGHT end of the row.
            The row borrows Personal info's geometry, but NOT its circle — a
            profile picture is a face and crops well, a company mark does not. */}
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setLogoOpen(true)}
          aria-haspopup="dialog"
          className={`${ROW} ${canManage ? ROW_TAP : "cursor-default"}`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="gallery" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center">
            <span className={ROW_LABEL}>Studio logo</span>
            <span className={ROW_VALUE}>
              {studio.logo
                ? "Shown at the top of this studio, and on its card in every member's account"
                : "Using the nompany mark — the default for a new studio"}
            </span>
          </span>
          {/* A tile, not a circle: this is a company's mark and it is shown
              WHOLE. Contained rather than cropped, so a wide wordmark keeps both
              ends and the tile's own shape stops mattering. */}
          <span className="ms-auto inline-flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-geex-sm dark:bg-white/5">
            {studio.logo
              /* A stored data URI, so next/image would only get in the way. */
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={studio.logo} alt="" className="h-full w-full object-contain" />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src="/brand/logo-icon.png" alt="" className="h-full w-full object-contain" />}
          </span>
        </button>
      </div>

      {logoOpen && (
        <LogoDialog
          slug={slug}
          logo={studio.logo}
          onClose={() => setLogoOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// The same dialog shape as the account hub's profile picture: a large preview,
// Change, and Remove.
function LogoDialog({ slug, logo, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save(value) {
    const res = await fetch(`/api/studios/${slug}/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo: value }),
    });
    if (!res.ok) throw new Error("save");
  }

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("Images must be 2 MB or smaller."); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error(media.error || "upload");
      await save(media.url);
      onSaved(); onClose();
    } catch { setErr("We couldn't upload that logo."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setErr("");
    try { await save(""); onSaved(); onClose(); }
    catch { setErr("We couldn't remove that logo."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Studio logo">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-[512px] overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c]">
        <div className="flex items-center gap-3 px-6 pt-5">
          <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">Studio logo</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-slate-500 dark:text-slate-400">
          Stands at the top of this studio in place of the nompany mark, and on the studio&apos;s
          card in the account of everyone who works in it.
        </p>

        {/* A WIDE frame, because the preview has to tell the truth about how the
            logo will sit: contained and whole. A square preview would quietly
            imply the mark gets cropped to one. */}
        <div className="flex justify-center px-6 py-6">
          <span className="inline-flex h-[136px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-geex border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            {logo
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={logo} alt="" className="h-full w-full object-contain" />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src="/brand/logo-icon.png" alt="" className="h-full w-full object-contain opacity-70" />}
          </span>
        </div>

        {err && <p className={`${BANNER_BAD} mx-6 mb-4`}>{err}</p>}

        <div className="flex flex-wrap justify-center gap-3 px-6">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className={BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="camera" className="h-4 w-4" /> {busy ? "Uploading…" : "Change"}
            </span>
          </button>
          <button type="button" className={BTN_GHOST} disabled={busy || !logo} onClick={remove}
            title={logo ? "" : "No logo to remove"}>
            Remove
          </button>
        </div>
        <p className="px-6 pb-6 pt-4 text-center text-xs text-slate-400">JPG, PNG or WebP, up to 2 MB.</p>
      </div>
    </div>
  );
}
