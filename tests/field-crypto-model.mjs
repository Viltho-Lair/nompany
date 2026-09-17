// ONE KEY FOR EVERY STORED CREDENTIAL (17/09/2026) — platform/auth/fieldCrypto.
//
// THE PROPERTIES THIS FILE HOLDS:
//
//   New values are written under NOMPANY_DATA_KEY and name the master that
//   made them, so a rotated master still reads them.
//   FIELD_ENCRYPTION_KEY is retired (every stored value was moved on
//   17/09/2026): a value written under it is refused even when the variable is
//   set, so the old key can never quietly come back into use.
//   A retired master still reads what it wrote while it stays listed.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import crypto from "node:crypto";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

// This file tests the LIVE scheme, so it must not run namespaced (which pins
// the public sandbox key and ignores the variable).
delete process.env.NOMPANY_KEY_PREFIX;
const m1 = crypto.randomBytes(32).toString("base64");
const m2 = crypto.randomBytes(32).toString("base64");
const OLD = "an-old-field-encryption-passphrase";
process.env.NOMPANY_DATA_KEY = `m1:${m1}`;

const F = await import("@/platform/auth/fieldCrypto");
const K = await import("@/platform/db/masterKeys");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A value exactly as the retired scheme wrote it.
function legacy(plain) {
  const key = crypto.createHash("sha256").update(OLD).digest();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

console.log("\n== writing");

const sealed = F.encryptField("1//refresh-token");
ok("a new value is written under the one key and names its master", sealed.startsWith("enc:v2:m1:"), sealed.slice(0, 12));
ok("...and does not contain the secret", !sealed.includes("refresh-token"));
ok("...and reads back", F.decryptField(sealed) === "1//refresh-token");
ok("a current value is not wrapped twice", F.encryptField(sealed) === sealed);
ok("an empty value stays empty", F.encryptField("") === "");

console.log("\n== the retired key");

process.env.FIELD_ENCRYPTION_KEY = OLD;
ok("a value under the retired key is refused, even with the variable set",
  F.isEncrypted(legacy("ya29.access")) && F.decryptField(legacy("ya29.access")) === "");
delete process.env.FIELD_ENCRYPTION_KEY;

console.log("\n== rotating the master");

process.env.NOMPANY_DATA_KEY = `m2:${m2},m1:${m1}`;
K.resetMasterKeyring();
ok("after rotation, what m1 wrote still reads", F.decryptField(sealed) === "1//refresh-token");
const rotated = F.encryptField("1//refresh-token");
ok("...and a new value is written under m2", rotated.startsWith("enc:v2:m2:") && F.decryptField(rotated) === "1//refresh-token");
process.env.NOMPANY_DATA_KEY = `m2:${m2}`;
K.resetMasterKeyring();
ok("with m1 removed, the m2 value still reads", F.decryptField(rotated) === "1//refresh-token");
ok("...and an m1 value does not", F.decryptField(sealed) === "");

console.log("\n== purposes");

const a = K.derivedSecret("otp");
const b = K.derivedSecret("ip-hash");
ok("each purpose gets its own secret from the one key", a && b && !a.equals(b));
delete process.env.NOMPANY_DATA_KEY;
K.resetMasterKeyring();
ok("no key: a derived secret is absent, never a default", K.derivedSecret("otp") === null);
ok("no key: writing a credential refuses, naming the variable",
  (() => { try { F.encryptField("x"); return false; } catch (e) { return /NOMPANY_DATA_KEY/.test(e.message); } })());

console.log(fails ? `\nfield crypto model: ${fails} FAILURES\n` : "\nfield crypto model: all passed\n");
process.exit(fails ? 1 : 0);
