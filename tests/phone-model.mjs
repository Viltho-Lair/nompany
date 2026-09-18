// A CUSTOMER'S PHONE NUMBER, reduced to one form (shared/phone).
//
// THE DEFECT THIS GUARDS: the till recognises a repeat customer by their
// number, and one number is typed four ways by different cashiers — recognised
// by the raw text, one person becomes four customers.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { normalizePhone, maskPhone } = await import("@/shared/phone");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const ksa = ["055 123 4567", "0551234567", "+966551234567", "00966 55 123 4567", "+966 (55) 123-4567"]
  .map((v) => normalizePhone(v, "Saudi Arabia"));
ok("every spelling of one Saudi number is one number", new Set(ksa).size === 1 && ksa[0] === "+966551234567", ksa.join(" "));
ok("Arabic-Indic digits are digits", normalizePhone("٠٥٥١٢٣٤٥٦٧", "Saudi Arabia") === "+966551234567");
ok("an international number ignores the studio's country", normalizePhone("+44 7700 900123", "Saudi Arabia") === "+447700900123");
ok("a studio with no country keeps a local number as digits, without a plus",
  normalizePhone("0551234567", "") === "0551234567");
ok("…and an international one still resolves", normalizePhone("+966551234567", "") === "+966551234567");
ok("too short is not a number", normalizePhone("12345", "Saudi Arabia") === "");
ok("more than fifteen digits is not a number", normalizePhone("+1234567890123456", "") === "");
ok("letters are not a number", normalizePhone("call me", "Jordan") === "");
ok("a masked number shows its last four", maskPhone("+966551234567") === "···4567");

console.log(fails ? `\nphone model: ${fails} FAILURES\n` : "\nphone model: all passed\n");
process.exitCode = fails ? 1 : 0;
