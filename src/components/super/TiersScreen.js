"use client";

import { useCallback, useEffect, useState } from "react";
import CatalogEditor from "@/components/super/CatalogEditor";

// Tiers and the ERP services they are made of, on one screen.
//
// The services list is above the tiers deliberately: a tier is a selection of
// services, so there is nothing useful to define until at least one exists, and
// splitting them across two pages would make that ordering invisible.
export default function TiersScreen() {
  const [services, setServices] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/catalog/services", { cache: "no-store" });
    if (res.ok) setServices((await res.json()).items || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const SERVICE_FIELDS = [
    { key: "name", label: "Service", type: "text", placeholder: "Inventory" },
    { key: "description", label: "Description", type: "text" },
  ];
  const TIER_FIELDS = [
    { key: "name", label: "Name", type: "text", placeholder: "Basic" },
    { key: "serviceIds", label: "ERP services", type: "services" },
    { key: "cost", label: "Cost", type: "number", prefix: "SAR " },
    { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo", zeroLabel: "Endless", hint: "0 means endless — the tier never expires." },
    // WHAT DASHBOARD ANALYTICS A STUDIO ON THIS TIER SELLS. Two controls, not one:
    // a master switch that turns the content on, and — only when it is on — a
    // per-section checklist of exactly which components the tier includes. Set per
    // tier, taking effect on every studio on the tier at once.
    //
    // `analyticsLevel` (the old select) is no longer editable here. It survives in
    // the store as the FALLBACK rung a pre-selection tier derives its set from
    // (see dashboardWidgets.enabledWidgets); the editor pre-fills the checklist
    // from that rung when an older tier is opened, so it is never rendered raw.
    { key: "analyticsEnabled", label: "Dashboard analytics", type: "switch", default: true,
      onLabel: "On", offLabel: "Off",
      hint: "On sells dashboard analytics to studios on this tier; off sells none." },
    {
      key: "dashboardWidgets", label: "Included components", type: "dashboard-widgets",
      showWhen: { field: "analyticsEnabled", equals: true, fallback: true },
      hint: "The exact dashboard components a studio on this tier sees, grouped by section.",
    },
    { key: "color", label: "Colour", type: "color", hint: "Shown wherever the tier is named." },
    { key: "isPublic", label: "Public", type: "switch" },
  ];

  return (
    <>
      {/* Editing a service tells this screen to re-read the list, so the tier
          table never prints a service under a name it no longer has. */}
      <CatalogEditor kind="services" title="ERP services" fields={SERVICE_FIELDS} onChanged={load} />
      <CatalogEditor kind="tiers" title="Tiers" fields={TIER_FIELDS} services={services} />
    </>
  );
}
