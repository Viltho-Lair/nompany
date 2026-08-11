// THE password policy — one definition shared by the sign-up form (live
// feedback) and the server (enforcement), so the two can never disagree.
// Client-safe: no Node imports.

export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => String(p || "").length >= 8 },
  { key: "upper",  label: "One uppercase letter",  test: (p) => /[A-Z]/.test(String(p || "")) },
  { key: "symbol", label: "One symbol",            test: (p) => /[^A-Za-z0-9]/.test(String(p || "")) },
];

// → { ok, failed: ["upper", …] }
export function checkPassword(password) {
  const failed = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.key);
  return { ok: failed.length === 0, failed };
}

// Human-readable reason for a rejection, for API error responses.
export function describeFailures(failed = []) {
  const byKey = Object.fromEntries(PASSWORD_RULES.map((r) => [r.key, r.label.toLowerCase()]));
  const parts = failed.map((k) => byKey[k]).filter(Boolean);
  return parts.length ? `Password needs ${parts.join(", ")}.` : "Password is too weak.";
}
