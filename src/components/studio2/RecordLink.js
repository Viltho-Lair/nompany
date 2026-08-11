import Link from "next/link";

// A reference to another record. When the viewer can reach that section it's a
// link; when they can't, the same information still shows — just not clickable,
// so a permission gap never looks like missing data.
export default function RecordLink({ href, children, mono = true, title }) {
  const base = `rounded-full px-2 py-0.5 text-xs ${mono ? "font-mono" : "font-600"}`;
  if (!href) {
    return <span className={`${base} bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400`} title={title}>{children}</span>;
  }
  return (
    <Link
      href={href}
      title={title || "Open"}
      className={`${base} bg-brand-500/10 text-brand-700 transition-colors hover:bg-brand-500/20 dark:text-brand-300`}
    >
      {children}
    </Link>
  );
}
