"use client";

import { useState } from "react";

export default function ContactForm({ dict }) {
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
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
        <p className="text-brand-950 dark:text-white">{dict.contact.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="name">{dict.contact.name}</label>
          <input id="name" required className="field-input" value={form.name} onChange={update("name")} />
        </div>
        <div>
          <label className="field-label" htmlFor="email">{dict.contact.email}</label>
          <input id="email" type="email" required className="field-input" value={form.email} onChange={update("email")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="phone">{dict.contact.phone}</label>
          <input id="phone" className="field-input" value={form.phone} onChange={update("phone")} dir="ltr" />
        </div>
        <div>
          <label className="field-label" htmlFor="subject">{dict.contact.subject}</label>
          <input id="subject" required className="field-input" value={form.subject} onChange={update("subject")} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="message">{dict.contact.message}</label>
        <textarea id="message" required rows={5} className="field-input resize-y" value={form.message} onChange={update("message")} />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{dict.contact.error}</p>
      )}
      <div>
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? dict.contact.sending : dict.contact.send}
        </button>
      </div>
    </form>
  );
}
