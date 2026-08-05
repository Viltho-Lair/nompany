// Aggregator provider selector (server-only). Keeps the rest of the app free of
// vendor specifics — swap providers by env without touching callers. Today:
// CargoAi. Add more adapters here and select via AWB_PROVIDER.
import * as cargoai from "@/lib/awbProviders/cargoai";

const PROVIDERS = { cargoai };

function active() {
  const name = (process.env.AWB_PROVIDER || "cargoai").toLowerCase();
  return PROVIDERS[name] || cargoai;
}

// Is any aggregator configured (has credentials)?
export function providerConfigured() {
  return active().isConfigured();
}

// Pull normalised status for an AWB via the active provider.
// Returns { origin, destination, pieces, weight, events:[...] } or throws.
export async function fetchAwbStatus({ prefix, serial }) {
  return active().fetchStatus({ prefix, serial });
}
