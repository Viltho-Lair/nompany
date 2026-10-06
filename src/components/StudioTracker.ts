"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, studioSectionFromPath } from "@/lib/track";

// The ERP's own traffic counter, mounted in the studio shell — the counterpart
// of SiteTracker on the public site, and what lets the Pulse wall offer a
// www / ERP toggle rather than a label.
//
// IT COUNTS SECTIONS, NEVER TENANTS OR RECORDS. The rule is in @/lib/track
// beside the website's, both because they answer the same question for the two
// surfaces and because a pure function living in a file that imports
// next/navigation cannot be tested — tests/geo-model.mjs asserts it.
//
// NOTHING IDENTIFIES ANYBODY. The beacon carries the same anonymous per-browser
// id the public site uses, and no session, collaborator or studio. What lands in
// the store is "somebody opened Procurement today", which is what a wall can
// honestly say about a multi-tenant product.
export default function StudioTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { page: studioSectionFromPath(pathname), site: "erp" });
  }, [pathname]);
  return null;
}
