// Shared editorial page header for public interior pages: small wide-tracked
// eyebrow, large uppercase title, and an optional lead paragraph.
export default function EditorialHeader({ eyebrow, title, lead }) {
  return (
    <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
      <div className="container-page pb-12 pt-36 sm:pt-44">
        {eyebrow && (
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{eyebrow}</p>
        )}
        <h1 className="mt-4 font-display text-5xl font-800 uppercase leading-[1.02] tracking-tight text-brand-950 dark:text-white sm:text-7xl">
          {title}
        </h1>
        {lead && <p className="mt-5 max-w-2xl text-lg text-steel-700 dark:text-slate-300">{lead}</p>}
      </div>
    </section>
  );
}
