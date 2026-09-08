import { redirect } from "next/navigation";
import { BASE } from "../../_components/nav";

// /super/dashboard — the console's HOME, and an alias rather than a screen.
//
// Analytics IS the dashboard: it is the one screen here that reads real data,
// and the seven demo dashboards that used to sit beside it — together with the
// index that chose between them, which lived at THIS EXACT PATH — were deleted
// in ae32da5. Nothing noticed that both doors into the console still name it:
// `(full)/page.js` redirects here when a session already exists, and SignIn
// sends you here after a successful post. So signing in landed on a 404 while
// every nav link, the sidebar logo and all twelve "Home" breadcrumbs pointed
// correctly at /dashboard/analytics — the one path a person never types.
//
// Kept as a redirect rather than repointing those two call sites, because
// /super/dashboard is the address the console's home has always had and old
// bookmarks still hold it. The day a second real dashboard exists, choosing
// between them belongs here.
export default function SuperDashboardHome() {
  redirect(`${BASE}/dashboard/analytics`);
}
