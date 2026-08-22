import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui's class helper: clsx resolves conditionals, tailwind-merge then
// de-duplicates conflicting Tailwind utilities so a caller's `className` always
// wins over a component's defaults (e.g. `px-4` passed in beats a built-in `px-2`).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
