import Link from "next/link";

// The chrome every legal document shares: hero with the version stamp, sticky
// table of contents, the sections themselves, and the contact card.
//
// EXTRACTED, NOT COPIED. This was inline in app/[locale]/terms/page.js and was
// the whole of that file; the Privacy Policy needs the identical layout, and a
// second copy would be a second place for a heading level, an anchor offset or a
// dark-mode token to drift. The route files are now the document they render and
// nothing else.
//
// A SERVER COMPONENT — no "use client". It reads nothing from the browser, and
// the locale arrives as a prop rather than from useStudioLocale, which is a
// client hook these public pages cannot call.

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

// Render a bold defined-term lead-in ("Account security.") inline before the
// rest of the paragraph, matching the drafting style of the source document.
function Paragraph({ block }) {
  return (
    <p className="text-[15px] leading-relaxed text-steel-700 dark:text-slate-300">
      {block.lead && (
        <strong className="font-700 text-brand-950 dark:text-white">{block.lead} </strong>
      )}
      {block.text}
    </p>
  );
}

function Block({ block }) {
  if (block.type === "p") return <Paragraph block={block} />;
  if (block.type === "h3")
    return <h3 className="font-display text-lg font-700 text-brand-950 dark:text-white">{block.text}</h3>;
  if (block.type === "ul")
    return (
      <ul className="space-y-2.5">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-steel-700 dark:text-slate-300">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  if (block.type === "table")
    return (
      <div className="overflow-x-auto rounded-geex border border-steel-200 dark:border-white/10">
        <table className="w-full border-collapse text-start text-sm">
          <thead>
            <tr className="bg-steel-50 dark:bg-steel-800">
              {block.head.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-steel-200 px-4 py-3 text-start font-display text-xs font-700 uppercase tracking-[0.08em] text-brand-950 dark:border-white/10 dark:text-white"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="align-top odd:bg-white even:bg-steel-50/50 dark:odd:bg-steel-900 dark:even:bg-steel-800/40">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-steel-100 px-4 py-3 leading-relaxed text-steel-700 last:border-b-0 dark:border-white/5 dark:text-slate-300"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return null;
}

/**
 * @param meta      LegalMeta — version and dates for the hero stamp.
 * @param sections  LegalSection[] — the document body.
 * @param copy      The i18n slice for this document (dict.terms / dict.privacy).
 * @param crossLink { href, label } — the sibling document, offered in the note
 *                  box. The two documents reference each other's clauses by
 *                  number, so a reader who lands on one needs a way to the other.
 */
export default function LegalDocument({ meta, sections, copy, crossLink }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-steel-400/15 bg-steel-900 dark:border-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
        <div className="container-page relative z-10 pb-16 pt-36 sm:pt-44">
          <p className={`${eyebrow} text-brand-300`}>{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{copy.lead}</p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-display text-xs font-600 uppercase tracking-[0.14em] text-white/60">
            <span>{copy.versionLabel}: {meta.version}</span>
            <span>{copy.effectiveLabel}: {meta.effective}</span>
            <span>{copy.updatedLabel}: {meta.updated}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[260px_1fr]">
          {/* Table of contents */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{copy.tocTitle}</p>
            <nav className="mt-5 flex flex-col gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm leading-snug text-steel-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Sections */}
          <div className="max-w-3xl">
            <div className="rounded-geex border border-brand-200 bg-brand-50/60 p-5 text-sm leading-relaxed text-steel-700 dark:border-brand-400/20 dark:bg-brand-400/5 dark:text-slate-300">
              {copy.langNote}
              {crossLink && (
                <>
                  {" "}
                  <Link
                    href={crossLink.href}
                    className="font-600 text-brand-700 underline underline-offset-2 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                  >
                    {crossLink.label}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-12 space-y-14">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-28">
                  <h2 className="font-display text-2xl font-800 tracking-tight text-brand-950 dark:text-white sm:text-3xl">
                    {s.title}
                  </h2>
                  <div className="mt-5 space-y-4">
                    {s.blocks.map((b, i) => (
                      <Block key={i} block={b} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Contact card */}
            <div className="mt-16 rounded-geex border border-steel-200 bg-steel-50 p-8 dark:border-white/10 dark:bg-steel-800">
              <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{copy.contactTitle}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-steel-700 dark:text-slate-300">{copy.contactLead}</p>
              <a
                href="mailto:info@nompany.com"
                className="mt-4 inline-block font-display text-sm font-700 text-brand-600 hover:text-brand-700 dark:text-brand-300"
              >
                info@nompany.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
