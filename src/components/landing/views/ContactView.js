"use client";
import { useState } from "react";
import { validateEnquiry, mailboxFor, TOPICS } from "@/shared/marketing/enquiry";
import { contactCopy } from "@/shared/marketing/contact";
import { CONTACT } from "@/lib/site";
import { useLandingLocale } from "@/components/landing/locale";
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion } from "motion/react";
import { Forward } from "@/components/landing/site/Chrome";
import { CELL_IN, Cta, EASE, useReadyReveal } from "@/components/landing/site/primitives";
import { SiteField, SubmitButton } from "@/components/landing/site/pages/contact/ContactParts";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The sent state and the form trade places through a short blur: the one going
// out loses focus, the one coming in finds it. Module constants, so a re-render
// is not a new target.
const SWAP_IN = { opacity: 1, filter: "blur(0px)", y: 0 };
const SWAP_OUT = { opacity: 0, filter: "blur(8px)", y: -6 };
const SWAP_FROM = { opacity: 0, filter: "blur(8px)", y: 8 };
const SWAP = { duration: 0.35, ease: EASE };

/**
 * THE CONTACT PAGE, in the site's design (27/09/2026).
 *
 * TWO COLUMNS AGAIN, AND NEITHER IS EMPTY. The page went to one column when the
 * card printing sales@ and support@ was taken out — a form beside 49% of
 * nothing is not a layout. The second column now holds the page's own heading,
 * its lead and the one action the lead itself recommends (open the free tier),
 * so the form stands on its own card beside something that earns the space.
 * Below `lg` it is one column, heading first.
 *
 * WHAT DID NOT CHANGE is everything the form does: the fields, their order, the
 * shared validator, the topic that routes the mailbox, the three submit states
 * and the in-flight guard. Only the look moved.
 *
 * NOTHING STARTS INVISIBLE IN THE HTML. The heading and the card are revealed
 * by keyframes over elements the server rendered settled (primitives.jsx), and
 * the form is the first child of an `initial={false}` AnimatePresence, so its
 * swap-in state is never written into the page.
 */
export function ContactView({ startLabel = "" }) {
  const locale = useLandingLocale();
  const reduce = useReducedMotion();
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

    const eyebrow = useReadyReveal(0);
    const heading = useReadyReveal(0.08);
    const lead = useReadyReveal(0.2);
    const action = useReadyReveal(0.3);
    const card = useReadyReveal(0.15, CELL_IN);

    const set = (key) => (value) => {
        setFields((f) => ({ ...f, [key]: value }));
        // Clear the error as soon as the user starts fixing it.
        setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    };
    /** Per-field status drives the tick beside each label. */
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
            // A shake is movement; somebody who asked for less of it gets the
            // messages alone, which carry the whole meaning anyway.
            if (!reduce && scope.current) {
                animate(scope.current, { x: [0, -10, 8, -4, 0] }, { duration: 0.42, ease: "easeInOut" });
            }
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

    // The fallback address follows the topic the sender chose, the same rule
    // the server uses to pick the mailbox.
    const fallback = mailboxFor(fields.topic) === "newBusiness" ? CONTACT.sales : CONTACT.support;

    return (
      <MotionConfig reducedMotion="user">
        <section className="relative px-6 pb-28 pt-36 md:px-10 md:pb-40 md:pt-44">
          {/* A single soft light behind the card, the accent at its faintest —
              the page is a form, and a form wants a quiet ground. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[640px]"
            style={{ background: `radial-gradient(60% 55% at ${locale === "ar" ? 30 : 70}% 30%, rgba(139,124,255,0.10), rgba(139,124,255,0) 70%)` }}
          />
          <div className="relative mx-auto grid max-w-[1280px] gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
            <div className="lg:pt-6">
              <p {...eyebrow} className="text-[15px] text-white/45">
                {ct.eyebrow}
              </p>
              {/* `h1` BECAUSE THIS IS A PAGE. While contact was a view inside
                  the landing page the h1 belonged to the hero; it is
                  `/{locale}/contact` now, and it had no h1 at all the moment it
                  became a route — the same omission the pricing board shipped
                  with when it left the views. */}
              <h1
                {...heading}
                className="mt-4 text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:tracking-normal"
              >
                {ct.title}
              </h1>
              <p {...lead} className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-[#9a9aa8] md:text-[17px]">
                {ct.lead}
              </p>
              {/* NOT "Request demo". There is no demo to request — the free
                  tier is the demo, and the lead above says so. This is the
                  action it recommends. */}
              {startLabel ? (
                <div {...action} className="mt-9">
                  <Cta href={`/api/intent?locale=${locale}`} variant="secondary">
                    {startLabel}
                    <Forward />
                  </Cta>
                </div>
              ) : null}
            </div>

            <div
              {...card}
              className="relative rounded-3xl bg-white/[0.025] p-6 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_50px_120px_-40px_rgba(24,16,80,0.7)] sm:p-8 md:p-10"
            >
              <AnimatePresence mode="wait" initial={false}>
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={SWAP_FROM}
                    animate={SWAP_IN}
                    exit={SWAP_OUT}
                    transition={SWAP}
                    role="status"
                    className="py-4"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-[#8b7cff]/15 ring-1 ring-inset ring-[#8b7cff]/30">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <motion.path
                          d="M6 12.5l4 4L18 8"
                          stroke="#c9c2ff"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                        />
                      </svg>
                    </span>
                    {/* WHAT THIS SAID BEFORE: that a solutions engineer would
                        email within one business day with three slots, and that
                        Nova had drafted a migration outline for your company.
                        None of those exist, and the message had not been sent
                        anywhere. It now says only what happened. */}
                    <h2 className="mt-6 text-[1.6rem] font-medium tracking-[-0.03em] rtl:tracking-normal">{ct.sentTitle}</h2>
                    <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-[#9a9aa8]">{ct.sentBody}</p>
                    <button
                      type="button"
                      onClick={() => setSent(false)}
                      className="mt-8 rounded-full text-[14px] text-[#c9c2ff] underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07070a]"
                    >
                      {ct.sendAnother}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    ref={scope}
                    onSubmit={handleSubmit}
                    noValidate
                    initial={SWAP_FROM}
                    animate={SWAP_IN}
                    exit={SWAP_OUT}
                    transition={SWAP}
                    className="space-y-6"
                  >
                    <div className="grid gap-6 sm:grid-cols-2">
                      <SiteField label={ct.fullName} value={fields.name} onChange={set("name")} status={statusFor("name")} error={errors.name} autoComplete="name" />
                      <SiteField label={ct.workEmail} type="email" value={fields.email} onChange={set("email")} status={statusFor("email")} error={errors.email} autoComplete="email" />
                    </div>
                    <SiteField label={ct.company} value={fields.company} onChange={set("company")} status={statusFor("company")} error={errors.company} autoComplete="organization" />
                    <SiteField label={ct.whatRunningToday} value={fields.message} onChange={set("message")} status={statusFor("message")} error={errors.message} multiline />
                    {/* THE ONE FIELD THAT CHANGES WHERE THIS GOES.

                        IT ASKED FOR A HEADCOUNT AND INFERRED THE REST — four
                        bands, and ten people or more meant sales. The inference
                        was reasonable and still a guess: a forty-person company
                        with a broken import is a support question. It also asked
                        a stranger for a number before they had decided to talk to
                        us at all. The sender knows which conversation they are
                        starting, so it asks.

                        A DROPDOWN, WITH THE SAME LABEL AND RING AS EVERYTHING
                        ELSE. The row of pills it replaced was a control the eye
                        had to learn separately on a form with four other inputs. */}
                    <SiteField
                      label={ct.topicLabel}
                      value={fields.topic}
                      onChange={set("topic")}
                      options={TOPICS.map((t) => ({ value: t, label: t === "sales" ? ct.sales : ct.support }))}
                    />

                    {/* A FAILURE THE VISITOR CAN ACT ON. The address is printed,
                        so a message that could not be sent is not simply lost. */}
                    <AnimatePresence initial={false}>
                      {failed ? (
                        <motion.div
                          key="failed"
                          role="alert"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl bg-rose-500/[0.07] px-5 py-4 ring-1 ring-inset ring-rose-400/25">
                            <p className="text-[14px] font-medium text-rose-300">{ct.failedTitle}</p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                              {ct.failedBody}{" "}
                              <a
                                dir="ltr"
                                className="rounded text-[#c9c2ff] underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]"
                                href={`mailto:${fallback}`}
                              >
                                {fallback}
                              </a>
                              .
                            </p>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <SubmitButton disabled={sending}>{sending ? ct.sending : ct.send}</SubmitButton>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </MotionConfig>
    );
}
