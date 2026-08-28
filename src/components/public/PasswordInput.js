"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict } from "@/shared/account";

// A password field with a reveal toggle. The eye sits inside the field, so the
// input reserves room for it on the trailing edge (`pe-11`, which flips under
// RTL). The button is deliberately `tabIndex={-1}`: tabbing from the password
// should land on the submit action, not on a visibility control.
export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  className = "landing-field",
  labelText,
  labelClassName = "landing-label",
  ariaInvalid,
  children,
}) {
  const tr = accountDict(useAccountLocale());
  const [shown, setShown] = useState(false);

  return (
    <div>
      {labelText && (
        <label className={labelClassName} htmlFor={id}>
          {labelText}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          className={`${className} pe-11`}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={ariaInvalid || undefined}
          required={required}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? tr.hidePassword : tr.showPassword}
          aria-pressed={shown}
          title={shown ? tr.hidePassword : tr.showPassword}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-fg-dim transition-colors hover:text-fg"
        >
          {shown ? (
            // Eye with a slash — currently visible, click to hide.
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.6 3.4M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7a9.6 9.6 0 003.9-.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}
