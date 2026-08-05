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
      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4 4 10-10" />
          </svg>
        </div>
        <p className="text-brand-950 dark:text-white">{t.success}</p>
        {backHref && (
          <Link href={backHref} className="btn-primary mt-5 inline-flex">
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
          <label className="field-label" htmlFor="ap-name">
            {t.name}<span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="ap-name"
            name="name"
            required
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "ap-name-err" : undefined}
            className={`field-input ${fieldErrors.name ? "border-red-500 focus:border-red-500" : ""}`}
            value={form.name}
            onChange={update("name")}
          />
          {fieldErrors.name && <p id="ap-name-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="ap-email">
            {t.email}<span className="ms-1 text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="ap-email"
            name="email"
            type="email"
            required
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "ap-email-err" : undefined}
            className={`field-input ${fieldErrors.email ? "border-red-500 focus:border-red-500" : ""}`}
            value={form.email}
            onChange={update("email")}
          />
          {fieldErrors.email && <p id="ap-email-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="ap-phone">{t.phone}</label>
          <input id="ap-phone" className="field-input" value={form.phone} onChange={update("phone")} dir="ltr" />
        </div>
        <div>
          <label className="field-label" htmlFor="ap-linkedin">{t.linkedin}</label>
          <input id="ap-linkedin" type="url" className="field-input" value={form.linkedin} onChange={update("linkedin")} dir="ltr" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="ap-message">{t.message}</label>
        <textarea id="ap-message" rows={4} className="field-input resize-y" value={form.message} onChange={update("message")} />
      </div>
      <div>
        <label className="field-label" htmlFor="ap-cv">
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
          className="block w-full text-sm text-steel-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-950/5 file:px-3 file:py-2 file:text-sm file:font-600 file:text-brand-700 hover:file:bg-brand-950/10 dark:text-slate-300 dark:file:bg-white/10 dark:file:text-brand-400"
        />
        <p className="mt-1 text-xs text-steel-400">{t.cvHint}</p>
        {fieldErrors.cv && <p id="ap-cv-err" className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.cv}</p>}
      </div>
      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
      {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{t.error}</p>}
      <div className="flex justify-end gap-3">
        {backHref && (
          <Link href={backHref} className="btn-ghost">
            {t.cancel}
          </Link>
        )}
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
