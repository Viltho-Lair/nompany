import Link from "next/link";
import { Icon } from "@/components/studio/icons";

// Accent presets for the icon chip.
const ACCENTS = {
  blue: "bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400",
  navy: "bg-brand-950/10 text-brand-950 dark:bg-white/10 dark:text-white",
  green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
  slate: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
};

export default function StatCard({ href, icon, label, value, sub, accent = "blue" }) {
  const inner = (
    <div className="flex h-full items-start justify-between gap-3 rounded-geex border border-slate-200/70 shadow-geex-sm bg-white p-5 transition-all hover:border-brand-500/30 hover:shadow-[0_18px_40px_-28px_rgba(2,32,89,0.35)] dark:border-white/10 dark:bg-[#20202c]">
      <div>
        <p className="text-sm font-500 text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 font-display text-3xl font-800 leading-none text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="mt-2 text-xs font-500 text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENTS[accent] || ACCENTS.blue}`}>
        <Icon name={icon} className="h-[22px] w-[22px]" />
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
