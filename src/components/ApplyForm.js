"use client";

import { useState } from "react";
import Link from "next/link";

const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const CV_MAX = 5 * 1024 * 1024;

// Plain (non-modal) application form, embedded directly on a job's page.
/* ON THE PUBLIC CHROME'S PALETTE, not the account layout's.
   ------------------------------------------------------------------
   This form has ONE caller — the job page — and that page moved onto the
   marketing shell, which is dark and deliberately does NOT set `.dark`
   (its palette comes from `.landing-page`). So every `.dark` variant here
   was dead and every light half won: white inputs, a brand-700 ghost
   button on near-black, and hint text in steel-400. It builds, it renders,
   and it is the one screen where a candidate types.

   `landing-label` / `landing-field` / `landing-secondary` exist for exactly
   this — they were written so the auth screens could adopt this palette
   without each restating a dozen utilities. The submit button spells its
   own classes because `landing-submit` is `w-full` and this one sits in a
   right-aligned row beside Cancel. */
export default function ApplyForm({ job, dict, backHref }) {
  const t = dict.apply;
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [err, setErr] = useState(""); // top-level (file rejects, network)
  const [fieldErrors, setFieldErrors] = useState({}); // per-required-field
  const [form, setForm] = useState({ name: "", email: "", phone: "", linkedin: "", message: "" });
  const [file, setFile] = useState(null);

  const clearFieldError = (k) => setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  const update = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    clearFieldError(k);
  };

  function pickFile(e) {
    const f = e.target.files?.[0];
    setErr("");
    clearFieldError("cv");
    if (!f) return setFile(null);
    if (!CV_TYPES.includes(f.type)) {
      e.target.value = "";
      setFile(null);
      return setErr(t.wrongType);
    }
    if (f.size > CV_MAX) {
      e.target.value = "";
      setFile(null);
      return setErr(t.tooBig);
    }
    setFile(f);
  }

  // Simple RFC-shape email check — matches what most browsers use for type=email.
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = t.fieldRequired;
    if (!form.email.trim()) errs.email = t.fieldRequired;
    else if (!isValidEmail(form.email.trim())) errs.email = t.invalidEmail;
    if (!file) errs.cv = t.cvMissing;
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErr("");
      return;
    }
    setFieldErrors({});
    setStatus("sending");
    setErr("");
    try {
      const body = new FormData();
      body.append("jobId", job.id);
      body.append("jobTitle", job.title);
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append("cv", file);
      const res = await fetch("/api/applications", { method: "POST", body });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-iris to-violet text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4 4 10-10" />
          </svg>
        </div>
        <p className="text-fg">{t.success}</p>
        {backHref && (
          <Link href={backHref} className="landing-secondary mt-5">
            {t.backToRoles}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="landing-label" htmlFor="ap-name">
            {t.name}<span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="ap-name"
            name="name"
            required
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "ap-name-err" : undefined}
            className={`landing-field ${fieldErrors.name ? "border-red-400 focus:border-red-400" : ""}`}
            value={form.name}
            onChange={update("name")}
          />
          {fieldErrors.name && <p id="ap-name-err" className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="landing-label" htmlFor="ap-email">
            {t.email}<span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="ap-email"
            name="email"
            type="email"
            required
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "ap-email-err" : undefined}
            className={`landing-field ${fieldErrors.email ? "border-red-400 focus:border-red-400" : ""}`}
            value={form.email}
            onChange={update("email")}
          />
          {fieldErrors.email && <p id="ap-email-err" className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="landing-label" htmlFor="ap-phone">{t.phone}</label>
          <input id="ap-phone" className="landing-field" value={form.phone} onChange={update("phone")} dir="ltr" />
        </div>
        <div>
          <label className="landing-label" htmlFor="ap-linkedin">{t.linkedin}</label>
          <input id="ap-linkedin" type="url" className="landing-field" value={form.linkedin} onChange={update("linkedin")} dir="ltr" />
        </div>
      </div>
      <div>
        <label className="landing-label" htmlFor="ap-message">{t.message}</label>
        <textarea id="ap-message" rows={4} className="landing-field resize-y" value={form.message} onChange={update("message")} />
      </div>
      <div>
        <label className="landing-label" htmlFor="ap-cv">
          {t.cv}<span className="ms-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="ap-cv"
          name="cv"
          type="file"
          required
          aria-invalid={!!fieldErrors.cv}
          aria-describedby={fieldErrors.cv ? "ap-cv-err" : undefined}
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={pickFile}
          className="block w-full text-sm text-fg-muted file:me-3 file:rounded-lg file:border-0 file:bg-iris/15 file:px-3 file:py-2 file:text-sm file:font-600 file:text-iris-bright hover:file:bg-iris/25"
        />
        <p className="mt-1 text-xs text-fg-dim">{t.cvHint}</p>
        {fieldErrors.cv && <p id="ap-cv-err" className="mt-1 text-xs text-red-400">{fieldErrors.cv}</p>}
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {status === "error" && <p className="text-sm text-red-400">{t.error}</p>}
      <div className="flex justify-end gap-3">
        {backHref && (
          <Link href={backHref} className="landing-secondary">
            {t.cancel}
          </Link>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-iris to-violet px-6 py-3 font-display text-sm font-600 tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          disabled={status === "sending"}
        >
          {status === "sending" ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
