import { sanitizeRichHtml, isProbablyHtml } from "@/lib/richText";

// Renders a rich-text value (bullets, numbering, bold, italic, underline). Old
// plain-text entries still render — with newlines preserved — so nothing broken
// on existing records.
export default function RichText({ value, className = "" }) {
  if (!value) return null;
  const dir = /[؀-ۿ]/.test(value) ? "rtl" : undefined;
  const base = "leading-relaxed text-steel-700 dark:text-slate-300 marker:text-brand-500 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_u]:underline [&_b]:font-700 [&_strong]:font-700 [&_i]:italic [&_em]:italic";
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
