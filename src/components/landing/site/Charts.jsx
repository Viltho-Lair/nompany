"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AreaChart, BarChart, ChartFrame, PALETTE } from "@/components/charts";
import { tourCopy } from "@/shared/marketing/tour";
import { useSite } from "./locale";
import { CELL_IN, useInViewReveal } from "./primitives";

/**
 * THE PRODUCT'S OWN CHARTS, LIVE ON THE PAGE. Not screenshots:
 * `components/charts` is the SVG kit every dashboard in the product draws
 * with, rendered here on sample figures. Switching the period redraws them,
 * which a picture cannot do — the visitor is touching the real component.
 *
 * SAMPLE FIGURES, SAID SO under the charts. They are shaped like a
 * contractor's year (money in lumpy, money out steadier) and are nobody's
 * results.
 */
const INVOICED = [118, 96, 142, 131, 88, 164, 152, 171, 139, 196, 184, 212];
const SPENT = [92, 88, 101, 110, 94, 122, 118, 131, 124, 142, 139, 151];
const PIPELINE = [458, 877, 227, 402];

function monthLabels(locale, n) {
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", { month: "short" });
  const now = new Date();
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(now.getFullYear(), now.getMonth() - n + i, 1)));
}

export function LiveCharts() {
  const { locale, rtl } = useSite();
  const tr = tourCopy(locale);
  const reduce = useReducedMotion();
  const [months, setMonths] = useState(12);
  const labels = useMemo(() => monthLabels(locale, months), [locale, months]);
  const head = useInViewReveal(0);
  const left = useInViewReveal(0.05, CELL_IN, 0.2);
  const right = useInViewReveal(0.15, CELL_IN, 0.2);

  const series = [
    { name: tr.chartIn, data: INVOICED.slice(-months), color: PALETTE[0] },
    { name: tr.chartOut, data: SPENT.slice(-months), color: PALETTE[2] },
  ];
  const panel = "rounded-3xl bg-white/[0.025] p-6 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8";

  return (
    <section className="relative px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1280px]">
        <motion.div {...head}>
          <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">{tr.chartsTitle}</h2>
          <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.chartsLead}</p>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <motion.div {...left} className={panel}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {series.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-2 text-[14px] text-white/65">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                  {s.name}
                </span>
              ))}
              <div className="ms-auto inline-flex rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10" role="radiogroup" aria-label={tr.chartsTitle}>
                {[6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={months === n}
                    onClick={() => setMonths(n)}
                    className={`rounded-full px-3.5 py-1 text-[12px] transition-colors duration-200 ${months === n ? "bg-[#ececf1] text-[#0b0b10]" : "text-white/55 hover:text-white"}`}
                  >
                    {n === 6 ? tr.periods.six : tr.periods.twelve}
                  </button>
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={months}
                initial={reduce ? false : { opacity: 0.001, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                {/* THE FRAME DRAWS THE AXES; the chart draws only the lines —
                    the same split every dashboard in the product uses. */}
                <ChartFrame labels={labels} height={260}>
                  <AreaChart series={series} height={260} rtl={rtl} showY={false} />
                </ChartFrame>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div {...right} className={panel}>
            <p className="text-[14px] text-white/65">{tr.chartPipeline}</p>
            <div className="mt-6">
              <ChartFrame labels={tr.stages} height={260}>
                <BarChart series={[{ name: tr.chartPipeline, data: PIPELINE, color: PALETTE[1] }]} height={260} rtl={rtl} />
              </ChartFrame>
            </div>
          </motion.div>
        </div>
        <p className="mt-4 text-center text-[12px] text-white/35">{tr.chartsNote}</p>
      </div>
    </section>
  );
}
