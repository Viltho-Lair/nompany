import { redirect } from "next/navigation";
import { BASE } from "../../_components/nav";

// /super/dashboard is the section root; Analytics is its landing screen.
export default function DashboardIndex() {
  redirect(`${BASE}/dashboard/analytics`);
}
