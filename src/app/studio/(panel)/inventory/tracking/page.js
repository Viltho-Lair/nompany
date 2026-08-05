import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Orders & Tracking was merged into Project Sheets (Main | Orders sub-bar).
// Keep the old path working for bookmarks / access-landing redirects.
export default function Page() {
  redirect("/studio/inventory/sheets");
}
