"use client";

import { useState } from "react";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";

// The contact form on a published company profile. Posts to the one
// unauthenticated write endpoint in the product, which is rate-limited per IP.
export default function ContactForm({ slug, company }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const ready = form.name.trim() && form.email.trim() && form.message.trim();

  async function submit(e) {
    e.preventDefault();
    setState("sending"); setError("");
    const res = await fetch(`/api/public/${slug}/contact`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok) { setState("sent"); return; }
    setState("error");
    setError(
      out.error === "rate" ? "That's a few messages in a short time — try again shortly."
      : out.error === "email" ? "That email address doesn't look right."
      : out.error === "incomplete" ? "Name, email and a message, please."
      : "We couldn't send that. Try again."
    );
  }

  if (state === "sent") {
    return (
      <section className="rounded-geex border border-emerald-300/60 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <h2 className="font-display text-lg font-800 text-emerald-800 dark:text-emerald-200">Message sent</h2>
        <p className="mt-1.5 text-sm text-emerald-800 dark:text-emerald-200">
          {/* Lowercased to match what was actually stored — emails are
              normalised throughout the product. */}
          Thanks — {company} has it, and will reply to {form.email.trim().toLowerCase()}.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">Send a message</h2>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">It goes straight to {company}.</p>

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <div>
          <label className={label} htmlFor="cf-name">Your name</label>
          <input id="cf-name" className={input} value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label className={label} htmlFor="cf-email">Email</label>
          <input id="cf-email" type="email" className={input} value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className={label} htmlFor="cf-phone">Phone</label>
          <input id="cf-phone" className={input} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className={label} htmlFor="cf-subject">Subject</label>
          <input id="cf-subject" className={input} value={form.subject} onChange={set("subject")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="cf-message">Message</label>
          <textarea id="cf-message" rows={4} className={input} value={form.message} onChange={set("message")} required />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={!ready || state === "sending"}
            className="rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">
            {state === "sending" ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}
