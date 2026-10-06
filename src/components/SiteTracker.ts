"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, pageLabelFromPath } from "@/lib/track";

// Mounted site-wide on the public layout. Records a page_view (and, via the
// visitor id, a distinct daily visitor) on every route change.
export default function SiteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { page: pageLabelFromPath(pathname) });
  }, [pathname]);
  return null;
}
