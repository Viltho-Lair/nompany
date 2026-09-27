"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileText, Upload } from "lucide-react";

const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const CV_MAX = 5 * 1024 * 1024;

/* THE APPLICATION FORM, IN THE SITE'S DESIGN (27/09/2026).
   ------------------------------------------------------------------
   One caller: the job page. It was the previous palette's `landing-*` fields
   and an indigo gradient button, re-skinned from outside by descendant
   selectors on the job page (`FORM_SKIN`, deleted with this rewrite).

   THE BEHAVIOUR IS UNCHANGED, and it is what the server checks: the same
   field names, the same client checks (name and email required, email shape,
   CV required, PDF/DOC/DOCX, 5 MB), the same FormData posted to
   /api/applications, and success shown only on an OK answer. The client
   checks are a courtesy; the route checks everything again.

   Labels above, errors below and tied to their field (`aria-describedby`),
   the site's inputs and one light primary pill. */

const LABEL = "mb-2 block text-[13px] font-medium text-white/60";
const FIELD =
  "block w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[16px] text-[#ececf1] ring-1 ring-inset ring-white/10 placeholder:text-white/30 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-[#8b7cff] sm:text-[15px]";
const FIELD_BAD = "ring-rose-400/70 focus:ring-rose-400";
const ERROR = "mt-1.5 text-[13px] text-rose-300";

function Required() {
  return (
    <span className="ms-1 text-[#c9c2ff]" aria-hidden="true">
      *
    </span>
  );
}

export default function ApplyForm({ job, dict, backHref }) {
  const t = dict.apply;
  const reduce = useReducedMotion();
  const fileInput = useRef(null);
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

  const swap = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, filter: "blur(6px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(6px)" } };

  const field = (key, label, { required = false, type = "text", dir } = {}) => (
    <div>
      <label className={LABEL} htmlFor={`ap-${key}`}>
        {label}
        {required ? <Required /> : null}
      </label>
      <input
        id={`ap-${key}`}
        name={key}
        type={type}
        required={required}
        dir={dir}
        aria-invalid={!!fieldErrors[key]}
        aria-describedby={fieldErrors[key] ? `ap-${key}-err` : undefined}
        className={`${FIELD} ${fieldErrors[key] ? FIELD_BAD : ""}`}
        value={form[key]}
        onChange={update(key)}
      />
      {fieldErrors[key] ? (
        <p id={`ap-${key}-err`} className={ERROR}>
          {fieldErrors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "success" ? (
        <motion.div key="done" {...swap} transition={{ duration: 0.35 }} role="status" className="rounded-3xl bg-white/[0.03] p-8 text-center ring-1 ring-inset ring-white/10">
          <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-[#8b7cff]/20 text-[#c9c2ff] ring-1 ring-inset ring-[#8b7cff]/40">
            <Check size={22} strokeWidth={2} />
          </span>
          <p className="text-[16px] leading-relaxed text-[#ececf1]">{t.success}</p>
          {backHref ? (
            <Link href={backHref} className="mt-6 inline-flex h-11 items-center rounded-full bg-white/[0.06] px-5 text-[14px] text-[#ececf1] ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.1]">
              {t.backToRoles}
            </Link>
          ) : null}
        </motion.div>
      ) : (
        <motion.form key="form" {...swap} transition={{ duration: 0.25 }} onSubmit={onSubmit} noValidate className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {field("name", t.name, { required: true })}
            {field("email", t.email, { required: true, type: "email" })}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("phone", t.phone, { dir: "ltr" })}
            {field("linkedin", t.linkedin, { type: "url", dir: "ltr" })}
          </div>
          <div>
            <label className={LABEL} htmlFor="ap-message">
              {t.message}
            </label>
            <textarea id="ap-message" name="message" rows={5} className={`${FIELD} resize-y`} value={form.message} onChange={update("message")} />
          </div>

          <div>
            <span className={LABEL} id="ap-cv-label">
              {t.cv}
              <Required />
            </span>
            {/* The native input stays (id `ap-cv`, name `cv`), visually hidden
                and still focusable; the tile is its label, so a click or a
                keyboard Enter on it opens the file picker. */}
            <input
              ref={fileInput}
              id="ap-cv"
              name="cv"
              type="file"
              required
              aria-labelledby="ap-cv-label"
              aria-invalid={!!fieldErrors.cv}
              aria-describedby={`ap-cv-hint${fieldErrors.cv ? " ap-cv-err" : ""}`}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={pickFile}
              className="peer sr-only"
            />
            <label
              htmlFor="ap-cv"
              className={`flex cursor-pointer items-center gap-4 rounded-2xl bg-white/[0.03] px-4 py-4 ring-1 ring-inset transition-colors hover:bg-white/[0.06] peer-focus-visible:ring-2 peer-focus-visible:ring-[#8b7cff] ${
                fieldErrors.cv ? "ring-rose-400/70" : "ring-white/10"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[#c9c2ff]">
                {file ? <FileText size={18} /> : <Upload size={18} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] text-[#ececf1]" dir="auto">
                  {file ? file.name : t.cv}
                </span>
                <span id="ap-cv-hint" className="mt-0.5 block text-[13px] text-white/45">
                  {t.cvHint}
                </span>
              </span>
            </label>
            {fieldErrors.cv ? (
              <p id="ap-cv-err" className={ERROR}>
                {fieldErrors.cv}
              </p>
            ) : null}
          </div>

          {err ? <p className="text-[14px] text-rose-300" role="alert">{err}</p> : null}
          {status === "error" ? <p className="text-[14px] text-rose-300" role="alert">{t.error}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {backHref ? (
              <Link href={backHref} className="inline-flex h-11 items-center rounded-full px-5 text-[14px] text-white/65 ring-1 ring-inset ring-white/15 transition-colors hover:text-white">
                {t.cancel}
              </Link>
            ) : null}
            <button
              type="submit"
              disabled={status === "sending"}
              aria-busy={status === "sending"}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#ececf1] px-6 text-[14px] font-medium text-[#0b0b10] transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a] disabled:opacity-60"
            >
              {status === "sending" ? t.submitting : t.submit}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
