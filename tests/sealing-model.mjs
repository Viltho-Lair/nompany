// CLIENT DATA SEALED AT REST, PURELY — platform/db/sealCipher.ts.
//
// THE PROPERTIES THIS FILE HOLDS, each the reason the design is what it is:
//
//   Nothing a client typed reaches the table readable, including fields added to
//   ClientSchema after today (default-sealed, by allowlist).
//   A sealed value only opens where it was written: another row, field or studio
//   refuses rather than reading as somebody else's data.
//   Sealing the same value twice gives the same text — updateRow re-runs its
//   patch, and parity compares the stores as text.
//   A value that will not open is an ERROR, never a blank or the token itself.
//   The public sandbox key can never guard a live row.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const C = await import("@/platform/db/sealCipher");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

const d1 = C.deriveDataKey("d1", crypto.randomBytes(32));
const d2 = C.deriveDataKey("d2", crypto.randomBytes(32));
const keys = { current: d1, byId: new Map([["d1", d1]]) };
const both = { current: d2, byId: new Map([["d1", d1], ["d2", d2]]) };

console.log("\n== what is sealed");

const client = {
  id: "cl_1", name: "Acme Holdings", code: "acme", industry: "Oil & Gas", notes: "board member's firm",
  contacts: [{ name: "Sara", email: "sara@acme.test", phone: "+966500000000", position: "CFO" }],
  locations: [{ name: "HQ", country: "SA", city: "Riyadh", url: "" }],
  rates: [{ itemId: "it_1", unitPrice: 120, note: "" }],
  logo: "data:image/png;base64,AAAA",
  createdByCollaboratorId: "co_1", createdAt: "2026-09-17T08:00:00.000Z", studioId: "st_1", sectionId: "se_1",
  someFieldAddedNextYear: "private",
};
const sealed = C.sealRow(keys, "st_1", "salesClients", "cl_1", client);
const text = JSON.stringify(sealed);
ok("no client detail survives into the stored text",
  !["Acme", "acme", "Sara", "sara@", "+9665", "Riyadh", "CFO", "board member", "Oil", "120", "private", "base64,AAAA"].some((w) => text.includes(w)), text.slice(0, 160));
ok("a field nobody has declared yet is sealed too — sealing is by default", C.isSealed(sealed.someFieldAddedNextYear));
ok("the row can still be found: id, tenant, section and dates stay clear",
  sealed.id === "cl_1" && sealed.studioId === "st_1" && sealed.sectionId === "se_1" && sealed.createdAt === client.createdAt);
ok("the keys keep their order, which the stores compare", Object.keys(sealed).join() === Object.keys(client).join());
ok("the id is not sealed on any collection", !C.isSealedField("salesTickets", "id") && !C.isSealedField("salesClients", "id"));

ok("a client's name copied onto an invoice is sealed", C.isSealedField("invoices", "clientName"));
ok("...and onto a project, and onto a record that does not exist yet",
  C.isSealedField("projects", "clientName") && C.isSealedField("somethingNew", "clientName"));
ok("a deal's contact, reference, title and site are sealed",
  ["contactEmail", "contactPhone", "ref", "title", "location"].every((f) => C.isSealedField("salesTickets", f)));
ok("but a deal's status and amounts are not — nothing about them names the client",
  !C.isSealedField("salesTickets", "status") && !C.isSealedField("salesTickets", "value"));
ok("a title on an unrelated register is left alone", !C.isSealedField("maintenanceOrders", "title"));
ok("an RFQ's reference and a journal memo are sealed — both carry the client",
  C.isSealedField("rfqs", "reference") && C.isSealedField("journalEntries", "memo"));
ok("a row with nothing sensitive needs no key", !C.rowNeedsSealing("salesTickets", { id: "t", status: "Lead" }));
ok("an empty client name needs none either", !C.rowNeedsSealing("invoices", { id: "i", clientName: null }));

console.log("\n== opening");

const back = C.openRow(keys, "st_1", "salesClients", sealed);
ok("a sealed client opens to exactly what was written", JSON.stringify(back) === JSON.stringify(client));
ok("arrays and numbers come back as arrays and numbers",
  Array.isArray(back.contacts) && back.rates[0].unitPrice === 120);
ok("a row with no tokens is returned as the same object — nothing copied",
  C.openRow(keys, "st_1", "salesClients", client) === client);
ok("a plain row written before sealing existed still reads",
  C.openRow(null, "st_1", "salesClients", { id: "cl_old", name: "Legacy" }).name === "Legacy");

const moved = { ...sealed, id: "cl_2" };
ok("a sealed value copied into another row does not open", throws(() => C.openRow(keys, "st_1", "salesClients", moved)));
ok("...nor in another studio", throws(() => C.openRow(keys, "st_2", "salesClients", sealed)));
const swapped = { ...sealed, name: sealed.notes };
ok("...nor into another field of the same row", throws(() => C.openRow(keys, "st_1", "salesClients", swapped)));
const tampered = { ...sealed, name: sealed.name.slice(0, -2) + (sealed.name.endsWith("A") ? "BB" : "AA") };
ok("an altered token is refused, never shown", throws(() => C.openRow(keys, "st_1", "salesClients", tampered)));
ok("a sealed value with no key at all is refused, with the variable named",
  (() => { try { C.openRow(null, "st_1", "salesClients", sealed); return false; } catch (e) { return /NOMPANY_DATA_KEY/.test(e.message); } })());
const other = { current: d2, byId: new Map([["d2", d2]]) };
ok("a value sealed under a key the studio no longer lists is refused", throws(() => C.openRow(other, "st_1", "salesClients", sealed)));

const typed = { id: "t_1", status: "ns1.d1.not-really-a-token" };
ok("token-shaped text somebody typed into an unsealed field reads as typed",
  C.openRow(keys, "st_1", "salesTickets", typed).status === typed.status);
const pasted = C.sealRow(keys, "st_1", "salesTickets", "t_1", { id: "t_1", title: "ns1.d1.not-really-a-token" });
ok("...and typed into a sealed field it is sealed like anything else, and comes back",
  C.openRow(keys, "st_1", "salesTickets", pasted).title === "ns1.d1.not-really-a-token");

console.log("\n== sealing twice");

ok("the same value in the same place seals to the same text",
  JSON.stringify(C.sealRow(keys, "st_1", "salesClients", "cl_1", client)) === text);
ok("the same name on two clients does not look the same",
  C.sealValue(d1, "st_1", "cl_1", "name", "Acme") !== C.sealValue(d1, "st_1", "cl_2", "name", "Acme"));
ok("...nor the same name in two fields of one row",
  C.sealValue(d1, "st_1", "cl_1", "name", "Acme").split(".")[2] !== C.sealValue(d1, "st_1", "cl_1", "code", "Acme").split(".")[2]);
ok("a changed value seals differently", C.sealValue(d1, "st_1", "cl_1", "name", "Acme") !== C.sealValue(d1, "st_1", "cl_1", "name", "Acme Ltd"));
ok("a value with no row id is refused rather than bound to nothing", throws(() => C.sealValue(d1, "st_1", "", "name", "x")));

console.log("\n== rotation");

const newer = C.sealRow(both, "st_1", "salesClients", "cl_1", client);
ok("after rotation new values name the new key", C.tokenKeyId(newer.name) === "d2");
ok("...and what the old key sealed still opens", C.openRow(both, "st_1", "salesClients", sealed).name === "Acme Holdings");
ok("...as does what the new one sealed", C.openRow(both, "st_1", "salesClients", newer).name === "Acme Holdings");

console.log("\n== the master keyring");

const raw = crypto.randomBytes(32);
const master = { id: "m1", key: raw };
const dek = crypto.randomBytes(32);
const wrapped = C.wrapDataKey(master, "st_1", "d1", dek);
ok("a studio key unwraps under the master that wrapped it", C.unwrapDataKey(master, "st_1", "d1", wrapped).equals(dek));
ok("...not as another studio's", throws(() => C.unwrapDataKey(master, "st_2", "d1", wrapped)));
ok("...not as another key id", throws(() => C.unwrapDataKey(master, "st_1", "d2", wrapped)));
ok("...not under another master", throws(() => C.unwrapDataKey({ id: "m2", key: crypto.randomBytes(32) }, "st_1", "d1", wrapped)));
ok("the wrapped key does not contain the key", !wrapped.includes(dek.toString("base64url")));

const env = `m2:${crypto.randomBytes(32).toString("base64")}, m1:${raw.toString("base64")}`;
const ring = C.parseMasterKeyring(env, false);
ok("the keyring reads current first, retired after", ring.map((k) => k.id).join() === "m2,m1" && ring[1].key.equals(raw));
ok("no variable means no key, never a default", C.parseMasterKeyring(undefined, false).length === 0);
ok("a short key is refused", throws(() => C.parseMasterKeyring(`m1:${crypto.randomBytes(16).toString("base64")}`, false)));
ok("a key without an id is refused", throws(() => C.parseMasterKeyring(crypto.randomBytes(32).toString("base64"), false)));
ok("the same id twice is refused", throws(() => C.parseMasterKeyring(`m1:${raw.toString("base64")},m1:${raw.toString("base64")}`, false)));
ok("the public sandbox key cannot be configured for a live store",
  throws(() => C.parseMasterKeyring(`t0:${raw.toString("base64")}`, false)));
const sandbox = C.parseMasterKeyring(env, true);
ok("a namespaced store uses the public sandbox key and ignores the real one",
  sandbox.length === 1 && sandbox[0].id === C.TEST_MASTER_ID && !sandbox[0].key.equals(raw));

console.log(fails ? `\nsealing model: ${fails} FAILURES\n` : "\nsealing model: all passed\n");
process.exit(fails ? 1 : 0);
