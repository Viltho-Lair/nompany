"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AreaChart, BarChart, ChartFrame, PALETTE } from "@/components/charts";
import { tourCopy } from "@/shared/marketing/tour";

/* ==================================================================
   THE PRODUCT'S OWN CHARTS, LIVE ON THE PAGE.

   Not screenshots: `components/charts` is the SVG kit every dashboard in
   the product draws with, rendered here on sample figures. Switching the
   period redraws them, which a picture cannot do — the point of the
   section is that visitors are touching the real component.

   SAMPLE FIGURES, SAID SO under the charts. They are shaped like a
   contractor's year (money in lumpy, money out steadier) and are not
   anybody's results.
================================================================== */

// Thousands, oldest month first.
const INVOICED = [118, 96, 142, 131, 88, 164, 152, 171, 139, 196, 184, 212];
const SPENT = [92, 88, 101, 110, 94, 122, 118, 131, 124, 142, 139, 151];
const PIPELINE = [458, 877, 227, 402];

// NO Y-AXIS FIGURES. The chart scales itself to its data, and ticks worked
// out here would not be the ones it drew against — an axis that disagrees with
// its own lines is worse than none, and these figures are illustrative anyway.

function monthLabels(locale: string, n: number) {
  // The twelve months up to the one before this, named in the page's own
  // language — never a hard-coded "Jan".
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", { month: "short" });
  const now = new Date();
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(now.getFullYear(), now.getMonth() - n + i, 1)));
}

export function LiveCharts({ locale }: { locale: string }) {
  const tr = tourCopy(locale);
  const reduce = useReducedMotion();
  const [months, setMonths] = useState<6 | 12>(12);
  const rtl = locale === "ar";
  const labels = useMemo(() => monthLabels(locale, months), [locale, months]);

  const series = [
    { name: tr.chartIn, data: INVOICED.slice(-months), color: PALETTE[0] },
    { name: tr.chartOut, data: SPENT.slice(-months), color: PALETTE[2] },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
      <p className="text-xs tracking-[0.16em] text-fg-dim uppercase">{tr.chartsEyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{tr.chartsTitle}</h2>
      <p className="mt-4 max-w-2xl text-fg-muted">{tr.chartsLead}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="surface rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {series.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                {s.name}
              </span>
            ))}
            <div className="ms-auto inline-flex rounded-full bg-white/5 p-0.5" role="radiogroup" aria-label={tr.chartsTitle}>
              {([6, 12] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={months === n}
                  onClick={() => setMonths(n)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${months === n ? "bg-white/10 text-fg" : "text-fg-dim hover:text-fg"}`}
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
              transition={{ duration: 0.35 }}
              className="mt-5"
            >
              {/* THE FRAME DRAWS THE AXES; the chart draws only the lines —
                  the same split every dashboard in the product uses. */}
              <ChartFrame labels={labels} height={260}>
                <AreaChart series={series} height={260} rtl={rtl} showY={false} />
              </ChartFrame>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="surface rounded-2xl p-6">
          <p className="text-sm text-fg-muted">{tr.chartPipeline}</p>
          <div className="mt-5">
            <ChartFrame labels={tr.stages} height={260}>
              <BarChart series={[{ name: tr.chartPipeline, data: PIPELINE, color: PALETTE[1] }]} height={260} rtl={rtl} />
            </ChartFrame>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-fg-dim">{tr.chartsNote}</p>
    </section>
  );
}
