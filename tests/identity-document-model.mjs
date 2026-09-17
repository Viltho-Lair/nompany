// AN EMPLOYEE'S IDENTITY DOCUMENT, PURELY (17/09/2026).
//
// THE DEFECTS THIS FILE GUARDS:
//
//   ID and passport numbers were removed on the owner's instruction. A number
//   field creeping back — on the stored defaults, the dictionary or the screen —
//   is the regression that matters, so the source is scanned for it.
//
//   A document with a type and no expiry would never be chased, so the reminder
//   rule reads the pair, and an untyped expiry is not a document at all.
//
//   The kind travels as a TOKEN and is translated where it is shown; an English
//   word stored or sent would read wrong to an Arabic studio.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const D = await import("@/shared/identityDocuments");
const { expiringDocuments } = await import("@/modules/hr/hr");
const { hrDict } = await import("@/shared/studio/hr");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the list");

ok("every type has an English and an Arabic label",
  D.IDENTITY_DOCUMENT_TYPES.every((t) => D.identityDocumentLabel(t, "en") && D.identityDocumentLabel(t, "ar") !== D.identityDocumentLabel(t, "en")));
ok("a passport reads as one mid-sentence", D.identityDocumentLabel("passport", "en", { inSentence: true }) === "passport");
ok("...and as its Arabic name to an Arabic reader", D.identityDocumentLabel("passport", "ar") === "جواز السفر");
ok("an unknown token is shown as stored rather than hidden", D.identityDocumentLabel("visa", "en") === "visa");
ok("only the app's own media path is accepted for a picture",
  D.MEDIA_PATH.test("/api/media/0123456789abcdef0123456789abcdef")
  && !D.MEDIA_PATH.test("https://evil.test/api/media/0123456789abcdef0123456789abcdef")
  && !D.MEDIA_PATH.test("/api/media/../users"));

console.log("\n== reminders");

const today = new Date("2026-09-17T00:00:00");
const person = (o) => ({ id: "c1", alias: "Sara", ...o });
const due = expiringDocuments([person({ documentType: "residencePermit", documentExpiry: "2026-10-01" })], today);
ok("a document inside the window is listed, carrying its type token",
  due.length === 1 && due[0].kind === "residencePermit" && due[0].daysLeft === 14, JSON.stringify(due));
ok("a lapsed document is listed with negative days",
  expiringDocuments([person({ documentType: "passport", documentExpiry: "2026-09-10" })], today)[0]?.daysLeft === -7);
ok("one far in the future is not",
  expiringDocuments([person({ documentType: "passport", documentExpiry: "2027-09-10" })], today).length === 0);
ok("an expiry with no document type is not a document",
  expiringDocuments([person({ documentExpiry: "2026-09-20" })], today).length === 0);
ok("the old ID and passport expiry fields are no longer read",
  expiringDocuments([person({ idExpiry: "2026-09-20", passportExpiry: "2026-09-20" })], today).length === 0);

console.log("\n== the numbers are gone");

const en = hrDict("en");
ok("the dictionary no longer offers a number field",
  !("idNumber" in en) && !("passportNumber" in en) && !("numbersEncrypted" in en));
const sources = [
  "src/modules/hr/hr.ts", "src/components/studio2/StudioHr.js",
  "src/platform/auth/collaborators.ts", "src/shared/studio/hr.ts",
];
const leftovers = sources.filter((f) => /idNumber|passportNumber|idExpiry|passportExpiry|idImage|passportImage/.test(readFileSync(f, "utf8")));
ok("no HR source names an ID or passport number field", leftovers.length === 0, leftovers.join(", "));
ok("HR no longer encrypts anything with FIELD_ENCRYPTION_KEY",
  !/fieldCrypto/.test(readFileSync("src/modules/hr/hr.ts", "utf8")));

console.log(fails ? `\nidentity document model: ${fails} FAILURES\n` : "\nidentity document model: all passed\n");
process.exit(fails ? 1 : 0);
