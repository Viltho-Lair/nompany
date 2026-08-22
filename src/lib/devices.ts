// Which kind of machine a request came from.
//
// Read off the user-agent at ingest and reduced to one of three words, then the
// string itself is thrown away. A user-agent is long and near-unique — it is a
// fingerprint — so storing "mobile" instead is both all the dashboard needs and
// far less than what arrived.

export const DEVICES = ["Desktop", "Mobile", "Tablet"];
export const DEVICE_KEYS: Record<string, string> = { Desktop: "desktop", Mobile: "mobile", Tablet: "tablet" };

// Tablets are checked FIRST: an iPad's user-agent says "Mobile" too, so asking
// about phones first would file every tablet as one.
export function deviceOf(userAgent: unknown) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return "Desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return "Mobile";
  return "Desktop";
}
