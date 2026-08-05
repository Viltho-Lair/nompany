"use client";

import { useEffect, useRef } from "react";
import { sanitizeRichHtml } from "@/lib/richText";

// Toolbar controls for the rich-text field. Uses document.execCommand — it is
// deprecated by spec but universally supported in every current browser and
// avoids pulling in a rich-text library just for five formatting buttons.
const CMDS = [
  { cmd: "bold", label: "B", title: "Bold", className: "font-bold" },
  { cmd: "italic", label: "I", title: "Italic", className: "italic" },
  { cmd: "underline", label: "U", title: "Underline", className: "underline" },
  { cmd: "insertUnorderedList", label: "•", title: "Bulleted list" },
  { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
];

export default function RichTextField({ field, value, onChange }) {
  const ref = useRef(null);
  const rtl = field?.name?.endsWith("_ar");

  // Sync external value into the editor only when it differs — avoids clobbering
  // the caret while the user is typing.
  useEffect(() => {
    if (!ref.current) return;
    if ((value || "") !== ref.current.innerHTML) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd) {
    ref.current?.focus();
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(cmd, false);
    onChange(sanitizeRichHtml(ref.current.innerHTML));
  }

  function onInput() {
    onChange(sanitizeRichHtml(ref.current.innerHTML));
  }

  // On paste, strip formatting so we don't inherit fonts/colours from Word/Docs.
  function onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand("insertText", false, text);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921]">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-1.5 dark:border-white/10">
        {CMDS.map((c) => (
          <button
            key={c.cmd}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(c.cmd)}
            title={c.title}
            aria-label={c.title}
            className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-md px-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 ${c.className || ""}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        dir={rtl ? "rtl" : "ltr"}
        onInput={onInput}
        onPaste={onPaste}
        role="textbox"
        aria-multiline="true"
        aria-label={field?.label}
        className="min-h-[140px] px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:text-white [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_u]:underline [&_b]:font-700 [&_strong]:font-700 [&_i]:italic [&_em]:italic [&_p]:my-1"
        suppressContentEditableWarning
      />
    </div>
  );
}
