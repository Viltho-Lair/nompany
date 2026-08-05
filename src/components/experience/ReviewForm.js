"use client";

import { useState } from "react";

function Star({ filled, onClick, onHover, onLeave }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="p-0.5 text-2xl transition-transform hover:scale-110"
      aria-label="rate"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill={filled ? "#f5a623" : "none"} stroke={filled ? "#f5a623" : "currentColor"} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9z" />
      </svg>
    </button>
  );
}

export default function ReviewForm({ open, onClose, dict }) {
  const t = dict.review;
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", position: "", comment: "" });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function close() {
    onClose();
    setStatus("idle");
    setErr("");
    setForm({ name: "", position: "", comment: "" });
    setRating(0);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name || !rating || !form.comment) {
      setErr(t.required);
      return;
    }
    setStatus("sending");
    setErr("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rating }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (!open) return null;

  const input =
    "w-full rounded-xl border border-steel-400/40 bg-white px-4 py-3 text-sm text-brand-950 placeholder:text-steel-400 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#223358] dark:text-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-brand-950/50 p-4 backdrop-blur-sm sm:p-8" onClick={close}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#263965] sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-700 text-brand-950 dark:text-white">{t.title}</h2>
          <button type="button" onClick={close} aria-label={t.cancel} className="-mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-steel-500 hover:bg-brand-950/5 dark:hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-6 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4 4 10-10" />
              </svg>
            </div>
            <p className="text-brand-950 dark:text-white">{t.success}</p>
            <button type="button" onClick={close} className="btn-primary mt-5">
              {t.cancel}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="rv-name">{t.name}</label>
                <input id="rv-name" required className={input} value={form.name} onChange={update("name")} />
              </div>
              <div>
                <label className="field-label" htmlFor="rv-position">{t.position}</label>
                <input id="rv-position" className={input} value={form.position} onChange={update("position")} />
              </div>
            </div>
            <div>
              <label className="field-label">{t.rating}</label>
              <div className="flex items-center gap-1 text-steel-400" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} filled={n <= (hover || rating)} onClick={() => setRating(n)} onHover={() => setHover(n)} onLeave={() => {}} />
                ))}
                {rating > 0 && <span className="ms-2 text-sm font-600 text-brand-700 dark:text-brand-500">{rating}/5</span>}
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="rv-comment">{t.comment}</label>
              <textarea id="rv-comment" required rows={4} className={`${input} resize-y`} value={form.comment} onChange={update("comment")} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            {status === "error" && <p className="text-sm text-red-600">{t.error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="btn-ghost">
                {t.cancel}
              </button>
              <button type="submit" className="btn-primary" disabled={status === "sending"}>
                {status === "sending" ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
