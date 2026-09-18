// THE PERSONAL PIN — its rules, and the idle timeouts a person may choose.
// Pure, so the Security page refuses exactly what the server refuses.
//
// ONE PIN, THREE JOBS (the owner, 18/09/2026): it unlocks a locked session, it
// is asked again before signing an approval, and on a paired till it is how a
// cashier takes over. It is NOT a way to sign in anywhere else, and it is never
// the account password — a PIN is typed in front of other people.

export const PIN_MIN = 4;
export const PIN_MAX = 8;

/** Wrong PINs before the session ends and the device must pass the emailed code again. */
export const PIN_MAX_FAILS = 5;

/**
 * Why a PIN would be refused, or "" when it is fine.
 *   format — not 4 to 8 digits
 *   weak   — one digit repeated, or a straight run up or down (1234, 9876)
 */
export function pinProblem(pin: unknown): "" | "format" | "weak" {
  const p = String(pin ?? "");
  if (!new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(p)) return "format";
  if (/^(\d)\1+$/.test(p)) return "weak";
  const steps = [...p].slice(1).map((c, i) => Number(c) - Number(p[i]));
  if (steps.every((d) => d === 1) || steps.every((d) => d === -1)) return "weak";
  return "";
}

/**
 * THE IDLE TIMEOUTS ON OFFER, in minutes. 0 is off — the default, so nobody's
 * screen starts locking the day this ships. There is no "never" beyond off and
 * nothing past eight hours, the length of an ordinary session.
 */
export const IDLE_CHOICES = [0, 5, 10, 15, 30, 60, 120, 240, 480] as const;
export const isIdleChoice = (m: unknown) => (IDLE_CHOICES as readonly number[]).includes(Number(m));
