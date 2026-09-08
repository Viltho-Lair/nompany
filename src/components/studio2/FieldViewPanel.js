"use client";

import { useCallback, useRef, useState } from "react";
import { Field } from "@/components/fields/Field";
import { fieldDict } from "@/shared/studio/field";
import { useReload } from "@/components/studio2/useReload";

// THE MOBILE FIELD VIEW — one technician's round, on the phone they are holding.
//
// MOBILE-FIRST RATHER THAN RESPONSIVE. Every other screen in this product is a
// desk screen that copes with a narrow window; this one is the opposite, and it
// is why the buttons are full-width and finger-sized rather than a toolbar that
// happens to wrap. A technician taps this with one hand in a plant room.
//
// THE CALLER NEVER NAMES THEMSELVES. `assignedToCollaboratorIds` holds
// CollaboratorIDs and the route reads the caller's own, so "my round" needs no
// parameter — which is also what stops one technician asking for another's.
export default function FieldViewPanel({ slug, locale = "en" }) {
  const tr = fieldDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState(null);
  const [who, setWho] = useState({ name: "", title: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/operations/field`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setProblem]);

  useReload(load);

  const move = useCallback(async (id, next) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/operations/jobs`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    await load();
  }, [slug, load, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { jobs = [], outstanding, completed, awaitingSignature = [] } = data;
  const time = (v) => (v ? `${String(v).slice(0, 10)} ${String(v).slice(11, 16)}` : tr.unscheduled);

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {tr.counts(outstanding, completed)}
        </p>
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* WORK THAT HAS BEEN DONE AND CANNOT BE PROVED. A real state to chase —
          nothing in the product could name it before. */}
      {awaitingSignature.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
          <h3 className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">{tr.awaiting}</h3>
          <ul className="mt-1 space-y-1">
            {awaitingSignature.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <span>{j.title}</span>
                <button
                  className="ms-auto rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-600 text-white"
                  onClick={() => { setSigning(j); setWho({ name: "", title: "" }); }}
                >
                  {tr.sign}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingOn}</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 dark:border-white/10">
              <div className="font-display text-base font-700 text-slate-900 dark:text-white">{j.title}</div>
              <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{time(j.scheduledStart)}</div>
              {j.location && <div className="text-sm text-slate-500 dark:text-slate-400">{j.location}</div>}
              {j.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{j.notes}</p>}

              {/* FULL-WIDTH, FINGER-SIZED. This is the one screen in the
                  product held in one hand. */}
              <div className="mt-3 grid gap-2">
                {j.status === "scheduled" && (
                  <button className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-600 text-white disabled:opacity-50"
                    disabled={busy} onClick={() => move(j.id, "in-progress")}>
                    {tr.start}
                  </button>
                )}
                {j.status === "in-progress" && (
                  <>
                    <button className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-600 text-white disabled:opacity-50"
                      disabled={busy} onClick={() => move(j.id, "completed")}>
                      {tr.finish}
                    </button>
                    {/* A SIGNATURE IS NOT A STATUS. A job can be signed while
                        the crew is still on site, and finished later with the
                        customer gone — so the two buttons stand side by side
                        rather than one leading to the other. */}
                    <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
                      onClick={() => { setSigning(j); setWho({ name: "", title: "" }); }}>
                      {tr.sign}
                    </button>
                  </>
                )}
              </div>

              {j.signoffs?.length > 0 && (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {tr.signedBy(j.signoffs[j.signoffs.length - 1].signedByName,
                    String(j.signoffs[j.signoffs.length - 1].at).slice(0, 10))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {signing && (
        <SignaturePad
          slug={slug} job={signing} tr={tr} who={who} setWho={setWho}
          onDone={async () => { setSigning(null); await load(); }}
          onCancel={() => { setSigning(null); setProblem(""); }}
          onProblem={setProblem}
        />
      )}
    </div>
  );
}

// THE PAD ITSELF.
//
// A CANVAS, NOT A LIBRARY. The whole of it is three pointer handlers and a
// `toBlob`, and `motion/react` is confined to the landing page for exactly this
// kind of reason — a signature pad is not worth a dependency in the studio's
// chunk.
//
// THE MARK GOES TO THE MEDIA ROUTE as a PRIVATE upload, which verifies
// membership before it writes and again before it serves. The blob URL is never
// given to a client; only the media id is stored on the job.
function SignaturePad({ slug, job, tr, who, setWho, onDone, onCancel, onProblem }) {
  const canvas = useRef(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);
  const [busy, setBusy] = useState(false);

  // THE CANVAS IS 480 WIDE AND DRAWN AT WHATEVER THE PHONE IS. A pointer
  // position is in CSS pixels and the canvas draws in its own; without the
  // scale the stroke lands short of the finger by the ratio between them, which
  // on a 320-pixel phone is a third of the way across.
  const at = (e) => {
    const el = canvas.current;
    const box = el.getBoundingClientRect();
    return [
      (e.clientX - box.left) * (el.width / box.width),
      (e.clientY - box.top) * (el.height / box.height),
    ];
  };

  // WHITE, NOT TRANSPARENT. `toBlob` captures the canvas and not the CSS behind
  // it, so a transparent PNG of a near-black mark is invisible the moment
  // anything renders it on a dark background — and a signature nobody can see
  // is the one failure this feature cannot have.
  const prime = (el) => {
    if (!el || el.dataset.primed) return;
    const ctx = el.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, el.width, el.height);
    el.dataset.primed = "1";
    canvas.current = el;
  };

  const down = (e) => {
    e.preventDefault();
    const ctx = canvas.current.getContext("2d");
    const [x, y] = at(e);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.beginPath(); ctx.moveTo(x, y);
    drawing.current = true;
    setDrawn(true);
    canvas.current.setPointerCapture?.(e.pointerId);
  };
  const moveTo = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvas.current.getContext("2d");
    const [x, y] = at(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => { drawing.current = false; };

  const clear = () => {
    const el = canvas.current;
    const ctx = el.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, el.width, el.height);
    setDrawn(false);
  };

  async function save() {
    setBusy(true);
    try {
      const blob = await new Promise((res) => canvas.current.toBlob(res, "image/png"));
      if (!blob) { onProblem("failed"); return; }
      const form = new FormData();
      form.append("file", blob, "signature.png");
      // PRIVATE. The route checks membership before it writes and again before
      // it serves, so the access decision stays in code rather than being
      // delegated to a store that cannot express it.
      // `slug` is the parameter name the route reads; a private upload with no
      // studio is refused outright, and it has to be THIS studio because the
      // serve route checks membership of the one the record names.
      const up1 = await fetch(`/api/media?kind=private&slug=${encodeURIComponent(slug)}`, {
        method: "POST", body: form,
      });
      const media = await up1.json().catch(() => ({}));
      if (!up1.ok) { onProblem(media.error || "upload"); return; }

      const res = await fetch(`/api/studios/${slug}/operations/field`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: job.id, mediaId: media.id,
          signedByName: who.name, signedByTitle: who.title,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { onProblem(body.detail || body.error || "failed"); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-geex bg-white p-4 dark:bg-[#20202c]">
        <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{tr.signFor(job.title)}</h3>

        <div className="mt-3 grid gap-2">
          {/* BOTH HALVES ARE REQUIRED and neither substitutes for the other: a
              squiggle nobody can read does not say who signed, and a typed name
              with no mark is the field this replaces. */}
          <Field label={tr.name} required className="w-full"
            value={who.name} onChange={(v) => setWho({ ...who, name: v })} />
          <Field label={tr.role} className="w-full"
            value={who.title} onChange={(v) => setWho({ ...who, title: v })} />
        </div>

        <canvas
          ref={prime} width={480} height={180}
          className="mt-3 w-full touch-none rounded-xl border border-slate-300 bg-white dark:border-white/20"
          onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerLeave={up}
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{tr.signHere}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-600 text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={clear}>{tr.clear}</button>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-600 text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={onCancel}>{tr.cancel}</button>
          <button
            className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !drawn || !who.name.trim()}
            onClick={save}
          >
            {busy ? tr.saving : tr.save}
          </button>
        </div>
      </div>
    </div>
  );
}
