"use client";
import { useState } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { EASE_OUT_EXPO, fadeUp, SPRING_SNAPPY, stagger } from "@/components/landing/lib/motion";
import { AiAssistant } from "../mascot/AiAssistant";
import { FloatingField } from "../ui/FloatingField";
import { MagneticButton } from "../ui/MagneticButton";
import { SectionHeading } from "../ui/SectionHeading";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function ContactView() {
    const [fields, setFields] = useState({
        name: "",
        email: "",
        company: "",
        message: "",
    });
    const [errors, setErrors] = useState({});
    const [sent, setSent] = useState(false);
    // Imperative shake keeps the form mounted (focus + entered values intact).
    const [scope, animate] = useAnimate();
    const set = (key) => (value) => {
        setFields((f) => ({ ...f, [key]: value }));
        // Clear the error as soon as the user starts fixing it.
        setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    };
    /** Per-field status drives the animated tick inside FloatingField. */
    const statusFor = (key) => {
        if (errors[key])
            return "error";
        if (key === "email")
            return EMAIL_RE.test(fields.email) ? "valid" : "idle";
        return fields[key].trim().length > 1 ? "valid" : "idle";
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const next = {};
        if (fields.name.trim().length < 2)
            next.name = "Tell us who to ask for.";
        if (!EMAIL_RE.test(fields.email))
            next.email = "Enter a valid work email.";
        if (fields.company.trim().length < 2)
            next.company = "Company name required.";
        if (fields.message.trim().length < 12)
            next.message = "A sentence or two about your stack helps us prepare.";
        if (Object.keys(next).length > 0) {
            setErrors(next);
            animate(scope.current, { x: [0, -10, 8, -4, 0] }, { duration: 0.42, ease: "easeInOut" });
            return;
        }
        setSent(true);
    };
    return (<section className="mx-auto max-w-7xl px-6 pt-32 pb-24 lg:pt-40">
      <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        {/* ---------------- Form ---------------- */}
        <div>
          <SectionHeading eyebrow="Contact" title="Book a demo with a solutions engineer" description="45 minutes, your data model on screen, no slide deck. We'll tell you honestly if Nompany isn't the right fit."/>

          <div className="mt-10">
            <AnimatePresence mode="wait" initial={false}>
              {sent ? (<motion.div key="sent" initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={SPRING_SNAPPY} className="surface relative overflow-hidden rounded-2xl p-8">
                  <span className="relative grid h-12 w-12 place-items-center">
                    {[0, 1].map((i) => (<motion.span key={i} className="absolute inset-0 rounded-full border border-mint/50" initial={{ scale: 0.7, opacity: 0.8 }} animate={{ scale: 2, opacity: 0 }} transition={{
                    duration: 1.4,
                    delay: i * 0.3,
                    ease: EASE_OUT_EXPO,
                }}/>))}
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-mint/15">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <motion.path d="M6 12.5l4 4L18 8" stroke="var(--color-mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}/>
                      </svg>
                    </span>
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    Request received, {fields.name.split(" ")[0]}.
                  </h3>
                  <p className="mt-2 text-fg-muted">
                    A solutions engineer will email {fields.email} within one
                    business day with three slots. Nova has already drafted a
                    migration outline for {fields.company}.
                  </p>
                  <button onClick={() => setSent(false)} className="mt-6 text-sm text-iris-bright underline-offset-4 hover:underline">
                    Send another request
                  </button>
                </motion.div>) : (<motion.form key="form" ref={scope} onSubmit={handleSubmit} noValidate variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <motion.div variants={fadeUp}>
                      <FloatingField label="Full name" value={fields.name} onChange={set("name")} status={statusFor("name")} error={errors.name} autoComplete="name"/>
                    </motion.div>
                    <motion.div variants={fadeUp}>
                      <FloatingField label="Work email" type="email" value={fields.email} onChange={set("email")} status={statusFor("email")} error={errors.email} autoComplete="email"/>
                    </motion.div>
                  </div>
                  <motion.div variants={fadeUp}>
                    <FloatingField label="Company" value={fields.company} onChange={set("company")} status={statusFor("company")} error={errors.company} autoComplete="organization"/>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingField label="What are you running today?" value={fields.message} onChange={set("message")} status={statusFor("message")} error={errors.message} multiline/>
                  </motion.div>
                  <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 pt-2">
                    <MagneticButton type="submit">Request demo</MagneticButton>
                    <p className="text-xs text-fg-dim">
                      We reply within one business day. No sequences, no drip.
                    </p>
                  </motion.div>
                </motion.form>)}
            </AnimatePresence>
          </div>
        </div>

        {/* ---------------- Aside ---------------- */}
        <motion.aside variants={stagger(0.1, 0.15)} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={fadeUp} className="surface rounded-3xl p-6">
            <AiAssistant size={230}/>
            <p className="mt-2 text-center text-sm text-fg-muted">
              Nova will sit in on the call and map your entities live.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
            {[
            { label: "Sales", value: "sales@nompany.com" },
            { label: "Support", value: "help@nompany.com" },
            { label: "EMEA", value: "Amsterdam · Riyadh" },
            { label: "Americas", value: "Austin · Toronto" },
        ].map((item) => (<div key={item.label} className="rounded-2xl border border-line bg-ink-soft/50 p-5">
                <p className="text-[11px] tracking-[0.16em] text-fg-dim uppercase">
                  {item.label}
                </p>
                <p className="mt-1.5 text-sm text-fg">{item.value}</p>
              </div>))}
          </motion.div>
        </motion.aside>
      </div>
    </section>);
}
