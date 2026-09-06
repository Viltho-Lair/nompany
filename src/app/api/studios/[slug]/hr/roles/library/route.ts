// THE ROLE CATALOGUE, ONE SEARCH AT A TIME.
//
// The library is ~3,000 entries and a few hundred kilobytes. It is NOT served
// whole and never reaches the browser: this returns matches, capped, for the
// department the screen is looking at. Shipping the catalogue would spend a
// sixth of the entire client budget on a list a picker needs twenty rows of,
// and Gate A asserts no client component imports it.
//
// GATED ON hr.employees.create, the same right that names a job by hand.
// Searching for a pre-built role to add and typing one from scratch are the
// same act with different ergonomics, so they answer to the same permission —
// and neither decides what the role may do.
import { route } from "@/platform/http/route";
import { hrContext, libraryRolesFor } from "@/modules/hr/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(
  { auth: "studio", context: hrContext, name: "hr/roles/library" },
  async (hr) => {
    const url = new URL(hr.request.url);
    return libraryRolesFor(hr, {
      departmentId: String(url.searchParams.get("department") || ""),
      q: String(url.searchParams.get("q") || ""),
    });
  },
);
