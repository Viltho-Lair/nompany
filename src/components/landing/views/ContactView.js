"use client";
import { useState } from "react";
import { validateEnquiry, mailboxFor, TOPICS } from "@/shared/marketing/enquiry";
import { contactCopy } from "@/shared/marketing/contact";
import { CONTACT } from "@/lib/site";
import { useLandingLocale } from "@/components/landing/locale";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { EASE_OUT_EXPO, fadeUp, SPRING_SNAPPY, stagger } from "@/components/landing/lib/motion";
import { FloatingField } from "../ui/FloatingField";
import { MagneticButton } from "../ui/MagneticButton";
import { SectionHeading } from "../ui/SectionHeading";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function ContactView() {
  const locale = useLandingLocale();
  // ONE MODULE, NOT TWO. This read eleven labels out of `landingDict` — the
  // whole marketing site's copy, both locales, 31.5 KB — and importing it put
  // all of that in this route's chunk group for the sake of "Full name" and
  // "Work email". The labels live in the page's own module now, which is both
  // the convention and, here, the difference between the route fitting inside
  // the bundle ceiling and not.
  const ct = contactCopy(locale);
    const [fields, setFields] = useState({
        name: "",
        email: "",
        company: "",
        message: "",
        // ROUTES THE ENQUIRY, and nothing else. Ten people or more reaches
        // sales, below that reaches support — both are addresses a person
        // reads, so an unanswered dropdown misfiles a message rather than
        // losing it.
        topic: "support",
    });
    const [errors, setErrors] = useState({});
    const [sent, setSent] = useState(false);
    // THREE STATES, NOT TWO. `sending` stops a second submission mid-flight,
    // and `failed` is the one this form never had: it used to call setSent(true)
    // unconditionally, so a visitor saw a tick whether or not anything left the
    // browser. It answers honestly now, which means it has to be able to say no.
    const [sending, setSending] = useState(false);
    const [failed, setFailed] = useState(false);
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
    // THE SHARED VALIDATOR ANSWERS IN KEYS; the page turns each into its own
    // language. The server runs the SAME function on what actually arrives, so
    // the two cannot disagree about what a valid enquiry is — and the browser's
    // answer stays a courtesy rather than a control.
    const MESSAGES = {
        name: ct.errName,
        email: ct.errEmail,
        company: ct.errCompany,
        message: ct.errMessage,
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (sending) return;
        const found = validateEnquiry(fields);
        const next = {};
        for (const key of Object.keys(found)) next[key] = MESSAGES[key] || MESSAGES.message;
        if (Object.keys(next).length > 0) {
            setErrors(next);
            animate(scope.current, { x: [0, -10, 8, -4, 0] }, { duration: 0.42, ease: "easeInOut" });
            return;
        }
        setFailed(false);
        setSending(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(fields),
            });
            const data = await res.json().catch(() => ({}));
            // ONLY A CONFIRMED SEND SHOWS THE TICK. The route answers ok:true
            // only once the mail has actually left, so anything else — a
            // refusal, a rate limit, a provider failure, a dead network — is
            // reported rather than smoothed over. Being told "that did not
            // send, here is the address" is worth more than a tick that means
            // nothing.
            if (res.ok && data.ok) setSent(true);
            else setFailed(true);
        } catch {
            setFailed(true);
        } finally {
            setSending(false);
        }
    };
    return (<section className="mx-auto max-w-2xl px-6 pt-32 pb-24 lg:pt-40">
      {/* ONE COLUMN. This was `lg:grid-cols-[1.05fr_1fr]`, and the second
          column held one thing: a card printing sales@ and support@. The owner
          asked for the card to go, and a two-column grid with one column left
          is not a layout — it is a form sitting beside 49% of nothing, which is
          the empty space complained about elsewhere on this site. The grid went
          with the card rather than after it. */}
      <div>
        {/* ---------------- Form ---------------- */}
        <div>
          {/* `as="h1"` BECAUSE THIS IS A PAGE NOW. While contact was a view
              inside the landing page the h1 belonged to the hero, and a second
              one here would have been a second document heading. It is
              `/{locale}/contact` now, and it had no h1 at all the moment it
              became a route — the same omission the pricing board shipped with
              when it left the views. */}
          <SectionHeading as="h1" eyebrow={ct.eyebrow} title={ct.title} description={ct.lead}/>

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
                  {/* WHAT THIS SAID BEFORE: that a solutions engineer would
                      email within one business day with three slots, and that
                      Nova had drafted a migration outline for your company.
                      None of those exist, and the message had not been sent
                      anywhere. It now says only what happened. */}
                  <h3 className="mt-5 font-display text-xl font-semibold">
                    {ct.sentTitle}
                  </h3>
                  <p className="mt-2 text-fg-muted">{ct.sentBody}</p>
                  <button onClick={() => setSent(false)} className="mt-6 text-sm text-iris-bright underline-offset-4 hover:underline">
                    {ct.sendAnother}
                  </button>
                </motion.div>) : (<motion.form key="form" ref={scope} onSubmit={handleSubmit} noValidate variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <motion.div variants={fadeUp}>
                      <FloatingField label={ct.fullName} value={fields.name} onChange={set("name")} status={statusFor("name")} error={errors.name} autoComplete="name"/>
                    </motion.div>
                    <motion.div variants={fadeUp}>
                      <FloatingField label={ct.workEmail} type="email" value={fields.email} onChange={set("email")} status={statusFor("email")} error={errors.email} autoComplete="email"/>
                    </motion.div>
                  </div>
                  <motion.div variants={fadeUp}>
                    <FloatingField label={ct.company} value={fields.company} onChange={set("company")} status={statusFor("company")} error={errors.company} autoComplete="organization"/>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <FloatingField label={ct.whatRunningToday} value={fields.message} onChange={set("message")} status={statusFor("message")} error={errors.message} multiline/>
                  </motion.div>
                  {/* THE ONE FIELD THAT CHANGES WHERE THIS GOES.

                      IT ASKED FOR A HEADCOUNT AND INFERRED THE REST — four
                      bands, and ten people or more meant sales. The inference
                      was reasonable and still a guess: a forty-person company
                      with a broken import is a support question. It also asked
                      a stranger for a number before they had decided to talk to
                      us at all. The sender knows which conversation they are
                      starting, so it asks.

                      A SELECT, THROUGH THE SAME FIELD AS EVERYTHING ELSE. The
                      row of pills it replaces was a control the eye had to
                      learn separately on a form with four other inputs. */}
                  <motion.div variants={fadeUp}>
                    <FloatingField
                      label={ct.topicLabel}
                      value={fields.topic}
                      onChange={set("topic")}
                      options={TOPICS.map((t) => ({ value: t, label: t === "sales" ? ct.sales : ct.support }))}
                    />
                  </motion.div>

                  {/* A FAILURE THE VISITOR CAN ACT ON. The address is printed,
                      so a message that could not be sent is not simply lost. */}
                  {failed ? (
                    <motion.div variants={fadeUp} className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3">
                      <p className="text-sm font-medium text-rose-300">{ct.failedTitle}</p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {ct.failedBody}{" "}
                        <a
                          className="text-iris-bright underline-offset-4 hover:underline"
                          href={`mailto:${mailboxFor(fields.topic) === "newBusiness" ? CONTACT.sales : CONTACT.support}`}
                        >
                          {mailboxFor(fields.topic) === "newBusiness" ? CONTACT.sales : CONTACT.support}
                        </a>
                        .
                      </p>
                    </motion.div>
                  ) : null}

                  <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4 pt-2">
                    {/* NOT "Request demo". There is no demo to request — the
                        free tier is the demo, and "Start free" is the only
                        primary call to action on this site. */}
                    <MagneticButton type="submit" disabled={sending}>
                      {sending ? ct.sending : ct.send}
                    </MagneticButton>
                  </motion.div>
                </motion.form>)}
            </AnimatePresence>
          </div>
        </div>

        {/* ---------------- Aside ---------------- */}
      </div>
    </section>);
}
