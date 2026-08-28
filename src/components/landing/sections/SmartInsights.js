"use client";
import { useEffect, useState } from "react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { AiAssistant } from "../mascot/AiAssistant";
import { SectionHeading } from "../ui/SectionHeading";
/* Home of TECHNIQUE 8. Nova sits beside a stack of insights that
   rotate on a timer — the copy changes, the character stays alive. */
// `id` is the React key and the transition identity; `tag` is what is read.
// They were the same string before, which meant the key changed with the
// language and every card would have remounted on a language switch.
const insightsFor = (tr) => [
    {
        id: "cash",
        tone: "var(--color-gold)",
        tag: tr.insCashFlow,
        text: tr.insCashFlowBody,
    },
    {
        id: "inventory",
        tone: "var(--color-cyan)",
        tag: tr.insInventory,
        text: tr.insInventoryBody,
    },
    {
        id: "workforce",
        tone: "var(--color-mint)",
        tag: tr.insWorkforce,
        text: tr.insWorkforceBody,
    },
    {
        id: "procurement",
        tone: "var(--color-violet)",
        tag: tr.insProcurement,
        text: tr.insProcurementBody,
    },
];
export function SmartInsights() {
  const tr = landingDict(useLandingLocale());
  const INSIGHTS = insightsFor(tr);
    const reduceMotion = useReducedMotion();
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setIndex((i) => (i + 1) % INSIGHTS.length), reduceMotion ? 9000 : 5200);
        return () => window.clearInterval(id);
    }, [reduceMotion]);
    const insight = INSIGHTS[index];
    return (<section id="insights" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="surface relative overflow-hidden rounded-3xl px-6 py-14 md:px-12">
        {/* Tint wash keyed to the current insight */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" animate={{
            background: `radial-gradient(70% 60% at 22% 40%, color-mix(in oklab, ${insight.tone} 13%, transparent), transparent 70%)`,
        }} transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}/>

        <div className="relative grid items-center gap-12 lg:grid-cols-[340px_1fr]">
          {/* ---- The character ---- */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={VIEWPORT} transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}>
            <AiAssistant size={300}/>
            <p className="mt-2 text-center text-xs tracking-[0.2em] text-fg-dim uppercase">
              {tr.novaAlwaysOn}
            </p>
          </motion.div>

          {/* ---- Copy + rotating insight ---- */}
          <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={VIEWPORT}>
            <SectionHeading eyebrow={tr.insEyebrow} title={tr.assistantReadsLedgerBefore} description={tr.novaWatchesEveryEvent}/>

            {/* Insight card swaps with a slide-and-fade */}
            <div className="relative mt-8 min-h-[9.5rem]">
              <AnimatePresence mode="wait">
                <motion.div key={index} initial={{ opacity: 0, y: 18, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -14, filter: "blur(4px)" }} transition={{ duration: 0.5, ease: EASE_OUT_EXPO }} className="rounded-2xl border border-line bg-ink/60 p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: insight.tone }}/>
                    <span className="text-[11px] tracking-[0.16em] uppercase" style={{ color: insight.tone }}>
                      {insight.tag}
                    </span>
                    {/* Typing dots */}
                    <span className="ml-auto flex gap-1">
                      {[0, 1, 2].map((i) => (<motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-fg-dim" animate={reduceMotion
                ? undefined
                : { opacity: [0.2, 1, 0.2], y: [0, -2, 0] }} transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
            }}/>))}
                    </span>
                  </div>
                  <p className="mt-3 text-fg">{insight.text}</p>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-full bg-iris/15 px-3.5 py-1.5 text-xs text-iris-bright transition-colors duration-200 hover:bg-iris/25">
                      {tr.approve}
                    </button>
                    <button className="rounded-full border border-line px-3.5 py-1.5 text-xs text-fg-muted transition-colors duration-200 hover:border-line/60 hover:text-fg">
                      {tr.showWorkings}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress pips */}
            <div className="mt-5 flex gap-1.5">
              {insightsFor(tr).map((item, i) => (<button key={item.id} onClick={() => setIndex(i)} aria-label={`Show ${item.tag} insight`} className="group py-2">
                  <motion.span className="block h-[3px] rounded-full bg-line" animate={{
                width: i === index ? 34 : 14,
                backgroundColor: i === index ? insight.tone : "var(--color-line)",
            }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}/>
                </button>))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>);
}
