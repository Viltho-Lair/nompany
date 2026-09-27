"use client";
import { reopenAnalyticsConsent } from "@/components/landing/chrome/AnalyticsConsent";

/** Opens the preferences panel from the cookie policy — the same door as the footer's link. */
export function SettingsButton({ label }) {
  return (
    <button
      type="button"
      onClick={reopenAnalyticsConsent}
      className="inline-flex h-11 items-center rounded-full bg-[#ececf1] px-5 text-[14px] font-medium text-[#0b0b10] transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a]"
    >
      {label}
    </button>
  );
}
