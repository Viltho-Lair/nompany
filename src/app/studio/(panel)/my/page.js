import { redirect } from "next/navigation";

// "My Dashboard" was fused into the single customizable home dashboard.
// Keep this redirect so old links/bookmarks still land somewhere useful.
export default function Page() {
  redirect("/studio");
}
