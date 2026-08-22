// Which currency to show someone, based on where they are reading from.
//
// The edge gives us a two-letter country code; this turns it into the currency
// that country actually uses, so a visitor from Jordan sees JOD and one from
// India sees INR without having to go looking for the picker.
//
// It is a DEFAULT, not a decision — the picker still overrides it, and nothing
// is charged in the currency shown. Prices are authored in SAR and converted
// for display.
//
// Grouped currency → countries, because the eurozone and the dollar users are
// the long rows and listing them that way is how anybody checks the table.

const GROUPS = {
  USD: "US AS EC SV FM GU MH MP PW PR TL TC VG VI BQ ZW PA",
  EUR: "AD AT AX BE CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM VA XK YT",
  GBP: "GB GG IM JE",
  SAR: "SA", AED: "AE", QAR: "QA", KWD: "KW", BHD: "BH", OMR: "OM",
  JOD: "JO", LBP: "LB", ILS: "IL PS", IQD: "IQ", SYP: "SY", YER: "YE",
  EGP: "EG", MAD: "MA EH", TND: "TN", DZD: "DZ", LYD: "LY", SDG: "SD",
  TRY: "TR", IRR: "IR", AFN: "AF", PKR: "PK", INR: "IN BT", LKR: "LK",
  NPR: "NP", BDT: "BD", MVR: "MV", CNY: "CN", JPY: "JP", KRW: "KR",
  HKD: "HK", TWD: "TW", MOP: "MO", SGD: "SG", MYR: "MY", THB: "TH",
  IDR: "ID", PHP: "PH", VND: "VN", KHR: "KH", LAK: "LA", MMK: "MM", BND: "BN",
  AUD: "AU CX CC HM KI NR NF TV", NZD: "NZ CK NU PN TK",
  CAD: "CA", MXN: "MX", BRL: "BR", ARS: "AR", CLP: "CL", COP: "CO",
  PEN: "PE", UYU: "UY", PYG: "PY", BOB: "BO", VES: "VE", GYD: "GY", SRD: "SR",
  CHF: "CH LI", NOK: "NO SJ BV", SEK: "SE", DKK: "DK FO GL", ISK: "IS",
  PLN: "PL", CZK: "CZ", HUF: "HU", RON: "RO", BGN: "BG", RSD: "RS",
  BAM: "BA", MKD: "MK", ALL: "AL", MDL: "MD", UAH: "UA", RUB: "RU",
  BYN: "BY", GEL: "GE", AMD: "AM", AZN: "AZ", KZT: "KZ", UZS: "UZ",
  KGS: "KG", TJS: "TJ", TMT: "TM", MNT: "MN",
  ZAR: "ZA LS NA SZ", NGN: "NG", KES: "KE", GHS: "GH", TZS: "TZ",
  UGX: "UG", ETB: "ET", RWF: "RW", ZMW: "ZM", MWK: "MW", MZN: "MZ",
  BWP: "BW", AOA: "AO", CDF: "CD", XOF: "BJ BF CI GW ML NE SN TG",
  XAF: "CM CF TD CG GQ GA", MUR: "MU", SCR: "SC", MGA: "MG", TTD: "TT",
  JMD: "JM", BSD: "BS", BBD: "BB", BZD: "BZ", DOP: "DO", HTG: "HT",
  GTQ: "GT", HNL: "HN", NIO: "NI", CRC: "CR", CUP: "CU", AWG: "AW",
  XCD: "AG AI DM GD KN LC MS VC", FJD: "FJ", PGK: "PG", SBD: "SB",
  TOP: "TO", VUV: "VU", WST: "WS", XPF: "PF NC WF",
};

// Prices are authored in SAR, so a country the table does not know falls back
// to USD rather than to the authoring currency: a visitor who is not from Saudi
// Arabia is far more likely to think in dollars than in riyals.
export const FALLBACK_CURRENCY = "USD";

const BY_COUNTRY = new Map<string, string>();
for (const [currency, codes] of Object.entries(GROUPS)) {
  for (const code of codes.split(" ")) BY_COUNTRY.set(code, currency);
}

export function currencyForCountry(countryCode: unknown) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (code.length !== 2) return FALLBACK_CURRENCY;
  return BY_COUNTRY.get(code) || FALLBACK_CURRENCY;
}
