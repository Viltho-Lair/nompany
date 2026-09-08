// ISO 3166-1 NUMERIC country codes, and the continent each one sits in.
//
// The dotted world map's point grid (public/pulse-dots.json) was generated from
// Natural Earth by way of world-atlas, which identifies a country by its
// NUMERIC id rather than the two-letter code the rest of this product speaks:
// the edge hands `/api/track` an alpha-2 in `x-vercel-ip-country`, and
// `continents.ts` has always keyed off that. This module is the one bridge
// between the two alphabets, and it exists so that `continents.ts` stays the
// single authority on which continent a country belongs to — a second grouping
// table would be free to disagree with the first about Turkey or Russia.
//
// ONLY THE CODES THE MAP ACTUALLY CONTAINS are listed. The grid has 149
// distinct ids, one of which is 0 — world-atlas's marker for a polygon with no
// recognised country (Northern Cyprus, Somaliland, the Kosovo boundary). Those
// dots are land and are drawn as land; they belong to no continent's total,
// exactly like an unrecognised alpha-2 falls to "Others" at ingest.
//
// scripts/generate/pulse-dots.mjs refuses to write a grid containing an id this
// table does not know, so a regenerated map cannot silently lose a country.

import { continentOf } from "./continents";

// "numeric:alpha2", grouped ten to a line for review rather than for the
// parser. Sorted by numeric id, which is the order the source data lists them.
const CODES = [
  "4:AF 8:AL 12:DZ 24:AO 31:AZ 32:AR 36:AU 40:AT 50:BD 51:AM",
  "56:BE 64:BT 68:BO 70:BA 72:BW 76:BR 100:BG 104:MM 108:BI 112:BY",
  "116:KH 120:CM 124:CA 140:CF 144:LK 148:TD 152:CL 156:CN 158:TW 170:CO",
  "178:CG 180:CD 188:CR 192:CU 203:CZ 204:BJ 208:DK 214:DO 218:EC 226:GQ",
  "231:ET 232:ER 233:EE 242:FJ 246:FI 250:FR 266:GA 268:GE 276:DE 288:GH",
  "300:GR 304:GL 320:GT 324:GN 328:GY 340:HN 348:HU 352:IS 356:IN 360:ID",
  "364:IR 368:IQ 372:IE 380:IT 384:CI 392:JP 398:KZ 400:JO 404:KE 408:KP",
  "410:KR 414:KW 417:KG 418:LA 426:LS 428:LV 430:LR 434:LY 440:LT 450:MG",
  "454:MW 458:MY 466:ML 478:MR 484:MX 496:MN 498:MD 504:MA 508:MZ 512:OM",
  "516:NA 524:NP 528:NL 554:NZ 558:NI 562:NE 566:NG 578:NO 586:PK 591:PA",
  "598:PG 600:PY 604:PE 608:PH 616:PL 620:PT 634:QA 642:RO 643:RU 646:RW",
  "682:SA 686:SN 688:RS 694:SL 703:SK 704:VN 705:SI 706:SO 710:ZA 716:ZW",
  "724:ES 728:SS 729:SD 732:EH 740:SR 752:SE 756:CH 760:SY 762:TJ 764:TH",
  "768:TG 784:AE 788:TN 792:TR 795:TM 800:UG 804:UA 807:MK 818:EG 826:GB",
  "834:TZ 840:US 854:BF 858:UY 860:UZ 862:VE 887:YE 894:ZM",
].join(" ");

const ALPHA2 = new Map<number, string>();
for (const pair of CODES.split(" ")) {
  const [num, code] = pair.split(":");
  ALPHA2.set(Number(num), code);
}

// The two-letter code for a numeric id, or "" for one this table does not know
// — including 0, which is the source data's "no country here".
export function alpha2Of(numeric: unknown): string {
  return ALPHA2.get(Number(numeric)) || "";
}

// Straight through `continentOf`, so the map and the traffic counters agree by
// construction about where a country is. Null rather than "Others" for an
// unknown id: at ingest a visit from nowhere recognised is still a visit and
// has to be counted somewhere, but a LAND DOT belonging to no country is not
// traffic at all and must not tint any continent's share.
export function continentOfNumeric(numeric: unknown): string | null {
  const code = alpha2Of(numeric);
  return code ? continentOf(code) : null;
}

export const KNOWN_NUMERIC_IDS = ALPHA2.size;
