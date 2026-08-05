import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui class-name helper: merge conditional classes and de-duplicate
// conflicting Tailwind utilities.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
