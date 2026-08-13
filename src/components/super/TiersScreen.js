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
    { key: "name", label: "Name", type: "text", placeholder: "Standard" },
    { key: "serviceIds", label: "ERP services", type: "services" },
    { key: "cost", label: "Cost", type: "number", prefix: "SAR " },
    { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo", zeroLabel: "Endless", hint: "0 means endless — the tier never expires." },
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
