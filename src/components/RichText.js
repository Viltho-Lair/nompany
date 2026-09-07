import { sanitizeRichHtml, isProbablyHtml } from "@/lib/richText";

// Renders a rich-text value (bullets, numbering, bold, italic, underline). Old
// plain-text entries still render — with newlines preserved — so nothing broken
// on existing records.
export default function RichText({ value, className = "" }) {
  if (!value) return null;
  const dir = /[؀-ۿ]/.test(value) ? "rtl" : undefined;
  // THE MARKETING SHELL IS NOT `.dark`. This carried a light/dark pair
  // (`text-steel-700 dark:text-slate-300`) for the account layout, and its
  // only two callers are the careers pages, which moved onto the public
  // chrome — a dark surface that never sets `.dark`, so the LIGHT half won
  // and a job description rendered dark grey on near-black. Shell tokens
  // resolve correctly in either place, so there is no pair to get wrong.
  const base = "leading-relaxed text-fg-muted marker:text-iris-bright [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_u]:underline [&_b]:font-700 [&_strong]:font-700 [&_i]:italic [&_em]:italic";
  if (isProbablyHtml(value)) {
    return (
      <div
        dir={dir}
        className={`${base} ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(value) }}
      />
    );
  }
  return (
    <div dir={dir} className={`whitespace-pre-wrap ${base} ${className}`}>
      {value}
    </div>
  );
}
