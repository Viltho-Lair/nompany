"use client";

// Imperative in-app dialogs that replace window.confirm / window.alert with a
// styled modal the user must answer. A single <AppDialogHost/> (mounted in the
// studio layout) registers the handler; if none is mounted we fall back to the
// native dialog so calls never hang.
let handler = null;

export function registerDialogHandler(fn) {
  handler = fn;
  return () => { if (handler === fn) handler = null; };
}

export function confirmDialog(opts) {
  const o = typeof opts === "string" ? { message: opts } : (opts || {});
  if (handler) return handler({ mode: "confirm", ...o });
  return Promise.resolve(typeof window !== "undefined" ? window.confirm(o.message || "Are you sure?") : true);
}

export function alertDialog(opts) {
  const o = typeof opts === "string" ? { message: opts } : (opts || {});
  if (handler) return handler({ mode: "alert", ...o });
  if (typeof window !== "undefined") window.alert(o.message || "");
  return Promise.resolve();
}
