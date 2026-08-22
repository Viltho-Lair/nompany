// Avatar initials from a person's display name:
//   "Abdullah Abu Hamad" → "AH"  (first + last word)
//   "Abdullah"           → "A"   (single word)
//   "abdullah@x.com"     → "A"   (email / one token)
//   "" / null            → "?"
// Used for account/user avatars so they reflect the PERSON, never the company.
export function initialsOf(value: unknown) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
