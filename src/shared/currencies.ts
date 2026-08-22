// "Currencies from CurrencyExchangeAPI" — the reference list of every currency
// ExchangeRate-API quotes, so the rest of the application has ONE place to ask
// what a three-letter code means.
//
// This is a static vocabulary, not live data: codes and names change about once
// a decade, while the RATES change daily and live in src/lib/data/exchangeRates.js.
// Keeping them apart means a dropdown can render its labels without waiting on
// (or spending) an API call.
//
// 166 codes: the published table at
// https://www.exchangerate-api.com/docs/supported-currencies, plus four the API
// actually quotes but that page omits — IRR, and the three redenomination pairs
// SLL/SLE, XCG/ANG and ZWG/ZWL, where BOTH the old and new codes are still
// returned. Verified against a live snapshot on 2026-08-15.
// KPW (North Korean won) is deliberately absent — the API does not quote it.
//
// Treat this as the NAMES, not the availability list: what is actually quoted on
// a given day comes from the snapshot itself (see quotedCodes below), so a code
// retired or added upstream shows up correctly without editing this file — it
// just renders under its bare code until someone adds a row here.
//
// Stored as tuples [code, name, country] purely to keep the table readable; every
// consumer gets objects out of CURRENCIES_FROM_EXCHANGE_API below.

const TABLE = [
  ["AED", "UAE Dirham", "United Arab Emirates"],
  ["AFN", "Afghan Afghani", "Afghanistan"],
  ["ALL", "Albanian Lek", "Albania"],
  ["AMD", "Armenian Dram", "Armenia"],
  ["ANG", "Netherlands Antillian Guilder", "Netherlands Antilles"],
  ["AOA", "Angolan Kwanza", "Angola"],
  ["ARS", "Argentine Peso", "Argentina"],
  ["AUD", "Australian Dollar", "Australia"],
  ["AWG", "Aruban Florin", "Aruba"],
  ["AZN", "Azerbaijani Manat", "Azerbaijan"],
  ["BAM", "Bosnia and Herzegovina Mark", "Bosnia and Herzegovina"],
  ["BBD", "Barbados Dollar", "Barbados"],
  ["BDT", "Bangladeshi Taka", "Bangladesh"],
  ["BGN", "Bulgarian Lev", "Bulgaria"],
  ["BHD", "Bahraini Dinar", "Bahrain"],
  ["BIF", "Burundian Franc", "Burundi"],
  ["BMD", "Bermudian Dollar", "Bermuda"],
  ["BND", "Brunei Dollar", "Brunei"],
  ["BOB", "Bolivian Boliviano", "Bolivia"],
  ["BRL", "Brazilian Real", "Brazil"],
  ["BSD", "Bahamian Dollar", "Bahamas"],
  ["BTN", "Bhutanese Ngultrum", "Bhutan"],
  ["BWP", "Botswana Pula", "Botswana"],
  ["BYN", "Belarusian Ruble", "Belarus"],
  ["BZD", "Belize Dollar", "Belize"],
  ["CAD", "Canadian Dollar", "Canada"],
  ["CDF", "Congolese Franc", "Democratic Republic of the Congo"],
  ["CHF", "Swiss Franc", "Switzerland"],
  ["CLF", "Chilean Unidad de Fomento", "Chile"],
  ["CLP", "Chilean Peso", "Chile"],
  ["CNH", "Offshore Chinese Renminbi", "China"],
  ["CNY", "Chinese Renminbi", "China"],
  ["COP", "Colombian Peso", "Colombia"],
  ["CRC", "Costa Rican Colon", "Costa Rica"],
  ["CUP", "Cuban Peso", "Cuba"],
  ["CVE", "Cape Verdean Escudo", "Cape Verde"],
  ["CZK", "Czech Koruna", "Czech Republic"],
  ["DJF", "Djiboutian Franc", "Djibouti"],
  ["DKK", "Danish Krone", "Denmark"],
  ["DOP", "Dominican Peso", "Dominican Republic"],
  ["DZD", "Algerian Dinar", "Algeria"],
  ["EGP", "Egyptian Pound", "Egypt"],
  ["ERN", "Eritrean Nakfa", "Eritrea"],
  ["ETB", "Ethiopian Birr", "Ethiopia"],
  ["EUR", "Euro", "European Union"],
  ["FJD", "Fiji Dollar", "Fiji"],
  ["FKP", "Falkland Islands Pound", "Falkland Islands"],
  ["FOK", "Faroese Króna", "Faroe Islands"],
  ["GBP", "Pound Sterling", "United Kingdom"],
  ["GEL", "Georgian Lari", "Georgia"],
  ["GGP", "Guernsey Pound", "Guernsey"],
  ["GHS", "Ghanaian Cedi", "Ghana"],
  ["GIP", "Gibraltar Pound", "Gibraltar"],
  ["GMD", "Gambian Dalasi", "The Gambia"],
  ["GNF", "Guinean Franc", "Guinea"],
  ["GTQ", "Guatemalan Quetzal", "Guatemala"],
  ["GYD", "Guyanese Dollar", "Guyana"],
  ["HKD", "Hong Kong Dollar", "Hong Kong"],
  ["HNL", "Honduran Lempira", "Honduras"],
  ["HRK", "Croatian Kuna", "Croatia"],
  ["HTG", "Haitian Gourde", "Haiti"],
  ["HUF", "Hungarian Forint", "Hungary"],
  ["IDR", "Indonesian Rupiah", "Indonesia"],
  ["ILS", "Israeli New Shekel", "Israel"],
  ["IMP", "Manx Pound", "Isle of Man"],
  ["INR", "Indian Rupee", "India"],
  ["IQD", "Iraqi Dinar", "Iraq"],
  ["IRR", "Iranian Rial", "Iran"],
  ["ISK", "Icelandic Króna", "Iceland"],
  ["JEP", "Jersey Pound", "Jersey"],
  ["JMD", "Jamaican Dollar", "Jamaica"],
  ["JOD", "Jordanian Dinar", "Jordan"],
  ["JPY", "Japanese Yen", "Japan"],
  ["KES", "Kenyan Shilling", "Kenya"],
  ["KGS", "Kyrgyzstani Som", "Kyrgyzstan"],
  ["KHR", "Cambodian Riel", "Cambodia"],
  ["KID", "Kiribati Dollar", "Kiribati"],
  ["KMF", "Comorian Franc", "Comoros"],
  ["KRW", "South Korean Won", "South Korea"],
  ["KWD", "Kuwaiti Dinar", "Kuwait"],
  ["KYD", "Cayman Islands Dollar", "Cayman Islands"],
  ["KZT", "Kazakhstani Tenge", "Kazakhstan"],
  ["LAK", "Lao Kip", "Laos"],
  ["LBP", "Lebanese Pound", "Lebanon"],
  ["LKR", "Sri Lanka Rupee", "Sri Lanka"],
  ["LRD", "Liberian Dollar", "Liberia"],
  ["LSL", "Lesotho Loti", "Lesotho"],
  ["LYD", "Libyan Dinar", "Libya"],
  ["MAD", "Moroccan Dirham", "Morocco"],
  ["MDL", "Moldovan Leu", "Moldova"],
  ["MGA", "Malagasy Ariary", "Madagascar"],
  ["MKD", "Macedonian Denar", "North Macedonia"],
  ["MMK", "Burmese Kyat", "Myanmar"],
  ["MNT", "Mongolian Tögrög", "Mongolia"],
  ["MOP", "Macanese Pataca", "Macau"],
  ["MRU", "Mauritanian Ouguiya", "Mauritania"],
  ["MUR", "Mauritian Rupee", "Mauritius"],
  ["MVR", "Maldivian Rufiyaa", "Maldives"],
  ["MWK", "Malawian Kwacha", "Malawi"],
  ["MXN", "Mexican Peso", "Mexico"],
  ["MYR", "Malaysian Ringgit", "Malaysia"],
  ["MZN", "Mozambican Metical", "Mozambique"],
  ["NAD", "Namibian Dollar", "Namibia"],
  ["NGN", "Nigerian Naira", "Nigeria"],
  ["NIO", "Nicaraguan Córdoba", "Nicaragua"],
  ["NOK", "Norwegian Krone", "Norway"],
  ["NPR", "Nepalese Rupee", "Nepal"],
  ["NZD", "New Zealand Dollar", "New Zealand"],
  ["OMR", "Omani Rial", "Oman"],
  ["PAB", "Panamanian Balboa", "Panama"],
  ["PEN", "Peruvian Sol", "Peru"],
  ["PGK", "Papua New Guinean Kina", "Papua New Guinea"],
  ["PHP", "Philippine Peso", "Philippines"],
  ["PKR", "Pakistani Rupee", "Pakistan"],
  ["PLN", "Polish Złoty", "Poland"],
  ["PYG", "Paraguayan Guaraní", "Paraguay"],
  ["QAR", "Qatari Riyal", "Qatar"],
  ["RON", "Romanian Leu", "Romania"],
  ["RSD", "Serbian Dinar", "Serbia"],
  ["RUB", "Russian Ruble", "Russia"],
  ["RWF", "Rwandan Franc", "Rwanda"],
  ["SAR", "Saudi Riyal", "Saudi Arabia"],
  ["SBD", "Solomon Islands Dollar", "Solomon Islands"],
  ["SCR", "Seychellois Rupee", "Seychelles"],
  ["SDG", "Sudanese Pound", "Sudan"],
  ["SEK", "Swedish Krona", "Sweden"],
  ["SGD", "Singapore Dollar", "Singapore"],
  ["SHP", "Saint Helena Pound", "Saint Helena"],
  ["SLE", "Sierra Leonean Leone", "Sierra Leone"],
  ["SLL", "Sierra Leonean Leone (old)", "Sierra Leone"],
  ["SOS", "Somali Shilling", "Somalia"],
  ["SRD", "Surinamese Dollar", "Suriname"],
  ["SSP", "South Sudanese Pound", "South Sudan"],
  ["STN", "São Tomé and Príncipe Dobra", "São Tomé and Príncipe"],
  ["SYP", "Syrian Pound", "Syria"],
  ["SZL", "Eswatini Lilangeni", "Eswatini"],
  ["THB", "Thai Baht", "Thailand"],
  ["TJS", "Tajikistani Somoni", "Tajikistan"],
  ["TMT", "Turkmenistan Manat", "Turkmenistan"],
  ["TND", "Tunisian Dinar", "Tunisia"],
  ["TOP", "Tongan Paʻanga", "Tonga"],
  ["TRY", "Turkish Lira", "Turkey"],
  ["TTD", "Trinidad and Tobago Dollar", "Trinidad and Tobago"],
  ["TVD", "Tuvaluan Dollar", "Tuvalu"],
  ["TWD", "New Taiwan Dollar", "Taiwan"],
  ["TZS", "Tanzanian Shilling", "Tanzania"],
  ["UAH", "Ukrainian Hryvnia", "Ukraine"],
  ["UGX", "Ugandan Shilling", "Uganda"],
  ["USD", "United States Dollar", "United States"],
  ["UYU", "Uruguayan Peso", "Uruguay"],
  ["UZS", "Uzbekistani So'm", "Uzbekistan"],
  ["VES", "Venezuelan Bolívar Soberano", "Venezuela"],
  ["VND", "Vietnamese Đồng", "Vietnam"],
  ["VUV", "Vanuatu Vatu", "Vanuatu"],
  ["WST", "Samoan Tālā", "Samoa"],
  ["XAF", "Central African CFA Franc", "CEMAC"],
  ["XCD", "East Caribbean Dollar", "Organisation of Eastern Caribbean States"],
  ["XCG", "Caribbean Guilder", "Curaçao and Sint Maarten"],
  ["XDR", "Special Drawing Rights", "International Monetary Fund"],
  ["XOF", "West African CFA Franc", "CFA"],
  ["XPF", "CFP Franc", "Collectivités d'Outre-Mer"],
  ["YER", "Yemeni Rial", "Yemen"],
  ["ZAR", "South African Rand", "South Africa"],
  ["ZMW", "Zambian Kwacha", "Zambia"],
  ["ZWG", "Zimbabwe Gold", "Zimbabwe"],
  ["ZWL", "Zimbabwean Dollar", "Zimbabwe"],
];

// The list itself: [{ code, name, country }, …] in code order.
// THE VOCABULARY'S SHAPE, named once. Exported because callers hold these — a
// picker's options, a search result — and an inline object literal repeated at
// six call sites is the same drift this codebase keeps finding in comments.
export type Currency = { code: string; name: string; country: string };

// A RATE TABLE quotes many currencies against one common base. Which base is the
// caller's business — crossRate divides two of them and never needs to know.
export type Rates = Record<string, number | string>;

export const CURRENCIES_FROM_EXCHANGE_API: Currency[] =
  TABLE.map(([code, name, country]) => ({ code, name, country }));

const BY_CODE = new Map(CURRENCIES_FROM_EXCHANGE_API.map((c) => [c.code, c]));

// Look one up. Unknown codes come back as a stub rather than undefined, so a
// label never renders as "undefined" if the API ever quotes something new.
export function currency(code: string): Currency {
  const c = String(code || "").trim().toUpperCase();
  return BY_CODE.get(c) || { code: c, name: c, country: "" };
}

export const currencyName = (code: string): string => currency(code).name;
export const isKnownCurrency = (code: string): boolean =>
  BY_CODE.has(String(code || "").trim().toUpperCase());

// ---- cross rates -----------------------------------------------------------
// Pure arithmetic over a rate table, kept HERE rather than beside the fetching
// code so the browser can import it without dragging Redis into the bundle.

// Units of `to` for one unit of `from`, where `rates` quotes both against one
// common base. Returns null when either side is unquoted, so a caller renders a
// dash instead of a wrong number.
export function crossRate(rates: Rates | null | undefined, from: string, to: string): number | null {
  if (!rates) return null;
  const a = Number(rates[from]);
  const b = Number(rates[to]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return b / a;
}

// Every currency a table actually quotes, in code order — the truth about what a
// picker may offer, as opposed to what the vocabulary above knows how to name.
export function quotedCodes(rates: Rates | null | undefined): string[] {
  return rates ? Object.keys(rates).sort() : [];
}

// A rate, at a precision that suits its magnitude: thousands of rupiah to the
// dollar need no decimals, a dinar needs several. Fixed decimals would render
// either "15,835.0000" or "0.31" depending on which you picked, and both are
// wrong for the other end of the range.
export function fmtRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  const digits = rate >= 1000 ? 2 : rate >= 1 ? 4 : 6;
  return rate.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Search by code, name or country — what a type-ahead dropdown needs. `codes`
// narrows the haystack to what is actually quoted today; omit it to search all.
export function searchCurrencies(query: string, codes?: string[] | null): Currency[] {
  const pool: Currency[] = codes
    ? codes.map((c) => currency(c))
    : CURRENCIES_FROM_EXCHANGE_API;
  const q = String(query || "").trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.country || "").toLowerCase().includes(q),
  );
}

// ---- landed cost -------------------------------------------------------------
// WHAT A REGISTERED ITEM COSTS THE STUDIO, IN THE STUDIO'S OWN MONEY.
//
// Registered Items holds an item's cost in whatever money it is BOUGHT in, and —
// for anything bought abroad — the shipping and customs it takes to get it here,
// in that same money. None of those three numbers is what a quotation is written
// in, so quoting the bare unit cost quoted a foreign price as though it were a
// local one: an item costing 100 USD was put on a SAR document as 100.
//
//     landed = (cost + shipping + customs) × rate(item currency → studio currency)
//
// The charges are AMOUNTS, added before the conversion, because that is what
// Registered Items asks for — the field is labelled with the item's own currency
// and takes 0.01 steps. Converting after adding is the same arithmetic as
// converting each part separately, and one multiplication is easier to check.
//
// NO RATE MEANS NO PRICE. When the pair is unquoted — or the day's snapshot never
// arrived — this answers `priced: false` and leaves the number at zero rather
// than falling back to the foreign figure. A quotation is a document a client is
// given; a number that is silently in the wrong currency is worse on it than a
// blank somebody has to go and fill in.
//
// Pure arithmetic over a rate table, like everything else in this section, so the
// screen that explains a converted price can use the same function that made it.
// The fields this reads off a stored item, and nothing else — an inventory row
// carries a dozen more that are none of this function's business.
export type PricedItem = {
  currency?: string;
  unitCost?: number | string;
  shippingCharges?: number | string;
  customsCharges?: number | string;
};

export function landedUnitCost(
  item: PricedItem | null | undefined,
  studioCurrency: string,
  rates: Rates | null | undefined,
) {
  const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const round = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

  const from = String(item?.currency || "").trim().toUpperCase();
  const to = String(studioCurrency || "").trim().toUpperCase();
  const cost = n(item?.unitCost);
  // Held blank rather than zero on a domestic item — see modules/inventory/inventory.js — and
  // blank adds nothing either way.
  const shipping = n(item?.shippingCharges);
  const customs = n(item?.customsCharges);

  // Bought in the studio's own money, or in nothing named: there is no
  // conversion to do, and no shipping or customs stored to add.
  if (!from || from === to) {
    return { priced: true, converted: false, unitPrice: round(cost), base: round(cost), shipping: 0, customs: 0, rate: null };
  }

  const base = cost + shipping + customs;
  // WHY it could not be priced, not just that it could not. A studio that never
  // named its own currency has nothing to convert INTO, which is fixed in
  // Settings; a pair today's snapshot does not quote is not, and the two send
  // whoever hits them to different places.
  if (!to) {
    return { priced: false, reason: "no-studio-currency", converted: true, unitPrice: 0, base: round(base), shipping, customs, rate: null };
  }
  const rate = crossRate(rates, from, to);
  if (rate == null) {
    return { priced: false, reason: "unquoted", converted: true, unitPrice: 0, base: round(base), shipping, customs, rate: null };
  }
  return { priced: true, converted: true, unitPrice: round(base * rate), base: round(base), shipping, customs, rate };
}
