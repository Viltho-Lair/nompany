import { redirect } from "next/navigation";
import { MARKETING_URL } from "@/lib/site";

// The marketing site is a separate deployment now. `proxy.js` already redirects
// "/" there at the edge; this is the fallback for anything that reaches the
// route directly (a request the matcher skipped, or a local run without the
// proxy).
export default function RootPage() {
  redirect(MARKETING_URL);
}
