// HOW CUSTOMERS PAY NOMPANY, stored — /super → Payments (the owner, 26/09/2026).
//
// PERMANENT, NOT A STOPGAP. Bank transfer is the only way to pay today, but it
// stays a way to pay once online payment exists, so this is the page every
// payment method is set up on: bank transfer now, card (and whatever comes
// after it) as `methods.<key>` beside it. It also holds what nompany prints on
// its own invoices (the seller), who is emailed when a customer says they paid,
// and how long such a claim holds the unpaid ladder.
//
// BANK DETAILS ARE ENCRYPTED AT REST (the owner: "do it but data encrypted").
// Each account's name, bank, IBAN, SWIFT and address are sealed together under
// a purpose subkey of NOMPANY_DATA_KEY (platform/auth/fieldCrypto); only the
// account's label and currency are plain, because those decide which account
// a customer is shown. They are opened only on the way to somebody allowed to
// read them: the console, or the owner of a studio who is about to pay.

import { getJSON, setJSON } from "@/platform/db/store";
import { BILLING } from "@/platform/db/keys";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import { cleanHoldHours, DEFAULT_CLAIM_HOLD_HOURS } from "@/shared/billingClaims";
import type { InvoiceParty } from "@/shared/nompanyInvoice";

export type BankAccount = {
  id: string;
  /** What the console calls it, e.g. "Arab Bank — USD". */
  label: string;
  /** The currency this account takes, or "" for any. A customer is shown the accounts for their currency first. */
  currency: string;
  bankName: string;
  accountName: string;
  iban: string;
  swift: string;
  bankAddress: string;
};

type StoredAccount = { id: string; label: string; currency: string; sealed: string };

export type Seller = InvoiceParty & { nameAr: string; invoicePrefix: string };

/**
 * THE METHODS A CUSTOMER MAY PAY BY. `available` is whether the product can
 * take it at all — card is listed so the page shows where it will go, and it
 * cannot be switched on until a payment provider is built (step 5).
 */
export const PAYMENT_METHODS = Object.freeze([
  { key: "bankTransfer", available: true },
  { key: "card", available: false },
] as const);
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

export type PaymentSettings = {
  seller: Seller;
  /** Where "a customer says they paid" and "a customer asks for a refund" are emailed, beside the bell. */
  notifyEmail: string;
  claimHoldHours: number;
  methods: {
    bankTransfer: { enabled: boolean; instructions: string; instructionsAr: string; accounts: BankAccount[] };
    card: { enabled: false };
  };
  updatedAt: string;
  updatedBy: string;
};

type Stored = Omit<PaymentSettings, "methods"> & {
  methods?: { bankTransfer?: { enabled?: boolean; instructions?: string; instructionsAr?: string; accounts?: StoredAccount[] } };
};

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_SELLER: Seller = { name: "", nameAr: "", address: "", country: "JO", taxNumber: "", email: "", phone: "", invoicePrefix: "NMP" };

function cleanSeller(v: unknown): Seller {
  const s = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    name: text(s.name, 160), nameAr: text(s.nameAr, 160), address: text(s.address, 400),
    country: text(s.country, 2).toUpperCase() || "JO", taxNumber: text(s.taxNumber, 40),
    email: EMAIL.test(text(s.email)) ? text(s.email) : "", phone: text(s.phone, 40),
    invoicePrefix: text(s.invoicePrefix, 8).toUpperCase().replace(/[^A-Z0-9]/g, "") || "NMP",
  };
}

/** An IBAN as the bank prints it: capitals, grouped in fours. */
const cleanIban = (v: unknown) => text(v, 50).replace(/\s+/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");

function openAccount(a: StoredAccount): BankAccount {
  let inner: Partial<BankAccount> = {};
  try { inner = JSON.parse(decryptField(a.sealed) || "{}"); } catch { inner = {}; }
  return {
    id: a.id, label: a.label, currency: a.currency,
    bankName: text(inner.bankName), accountName: text(inner.accountName), iban: text(inner.iban, 60),
    swift: text(inner.swift, 11), bankAddress: text(inner.bankAddress, 300),
  };
}

function sealAccount(v: unknown, i: number): StoredAccount | null {
  const a = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const iban = cleanIban(a.iban);
  const accountName = text(a.accountName, 160);
  // An account nobody can pay into is not an account: both are what a
  // customer's bank asks for first.
  if (!iban || !accountName) return null;
  const currency = text(a.currency, 3).toUpperCase();
  return {
    id: text(a.id, 40) || `acct_${Date.now().toString(36)}_${i}`,
    label: text(a.label, 80),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
    sealed: encryptField(JSON.stringify({
      bankName: text(a.bankName, 160), accountName, iban,
      swift: text(a.swift, 11).replace(/\s+/g, "").toUpperCase(), bankAddress: text(a.bankAddress, 300),
    })),
  };
}

function open(stored: Stored | null): PaymentSettings {
  const bt = stored?.methods?.bankTransfer;
  return {
    seller: cleanSeller(stored?.seller || EMPTY_SELLER),
    notifyEmail: EMAIL.test(text(stored?.notifyEmail)) ? text(stored?.notifyEmail) : "",
    claimHoldHours: stored?.claimHoldHours === undefined ? DEFAULT_CLAIM_HOLD_HOURS : cleanHoldHours(stored.claimHoldHours),
    methods: {
      bankTransfer: {
        // ON UNTIL SOMEBODY SWITCHES IT OFF: it is the only way to pay today.
        enabled: bt?.enabled !== false,
        instructions: text(bt?.instructions, 1000),
        instructionsAr: text(bt?.instructionsAr, 1000),
        accounts: (bt?.accounts || []).map(openAccount),
      },
      card: { enabled: false },
    },
    updatedAt: text(stored?.updatedAt, 40),
    updatedBy: text(stored?.updatedBy, 80),
  };
}

/** Everything, opened — for the console and the server alone. */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  return open(await getJSON<Stored>(BILLING.paymentSettings));
}

/**
 * SAVED WHOLE, from the console's one form. Every account is sealed again on
 * each save, which is what a rotated key wants anyway.
 */
export async function savePaymentSettings(body: Record<string, unknown>, by: string): Promise<PaymentSettings> {
  const methods = (body.methods && typeof body.methods === "object" ? body.methods : {}) as Record<string, Record<string, unknown>>;
  const bt = methods.bankTransfer || {};
  const accounts = (Array.isArray(bt.accounts) ? bt.accounts : []).slice(0, 12)
    .map(sealAccount).filter((a): a is StoredAccount => Boolean(a));
  const next: Stored = {
    seller: cleanSeller(body.seller),
    notifyEmail: EMAIL.test(text(body.notifyEmail)) ? text(body.notifyEmail) : "",
    claimHoldHours: cleanHoldHours(body.claimHoldHours),
    methods: {
      bankTransfer: {
        enabled: bt.enabled !== false,
        instructions: text(bt.instructions, 1000),
        instructionsAr: text(bt.instructionsAr, 1000),
        accounts,
      },
    },
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  await setJSON(BILLING.paymentSettings, next);
  return open(next);
}

/**
 * WHAT A CUSTOMER ABOUT TO PAY IS SHOWN: the ways they can pay, and for a bank
 * transfer the accounts that take their currency (or any currency). Never the
 * seller's settings beyond the name, and never the claim hold or the console's
 * email.
 */
export function paymentOptionsFor(settings: PaymentSettings, currency: string) {
  const bt = settings.methods.bankTransfer;
  const cur = String(currency || "").toUpperCase();
  const matching = bt.accounts.filter((a) => a.currency === cur);
  const any = bt.accounts.filter((a) => !a.currency);
  const accounts = matching.length ? [...matching, ...any] : any.length ? any : bt.accounts;
  return {
    payee: settings.seller.name,
    bankTransfer: bt.enabled && accounts.length
      ? { instructions: bt.instructions, instructionsAr: bt.instructionsAr, accounts: accounts.map(({ id, label, currency: c, bankName, accountName, iban, swift, bankAddress }) => ({ id, label, currency: c, bankName, accountName, iban, swift, bankAddress })) }
      : null,
    card: null,
  };
}
