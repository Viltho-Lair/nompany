"use client";

// Small client control for the 404 page — steps back in history when possible,
// otherwise falls back to the provided home href.
export default function BackButton({ label, fallbackHref, className }) {
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (fallbackHref) {
      window.location.assign(fallbackHref);
    }
  };
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
