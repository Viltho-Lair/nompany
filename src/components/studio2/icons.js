// Small inline icon set for the Studio panel. Each is a 24x24 stroke icon that
// inherits `currentColor`, sized by the caller via className.
//
// Ported from the Old System's studio icon set so the Studio chrome matches it
// exactly. `money`, `gears`, `techService`, `live` and `checkCircle` are the
// five additions DESIGN.md already documents for this set.
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Icons supplied as PNG artwork rather than drawn here. They are rendered as a
// CSS MASK, not an <img>: the artwork's alpha becomes the shape and the fill is
// `currentColor`, so a supplied icon still darkens on hover and turns brand
// blue when its section is the active one — which an <img> could not do. It
// also means the artwork's own colour is irrelevant, so a monochrome and a
// coloured file behave identically here.
const IMAGES = {
  report: "report.png",
  rfp: "request-for-proposal.png",
  blueprint: "blueprint.png",
  tools: "support.png",
  overtime: "overtime.png",
  ticket: "ticket.png",
  group: "multiple-users-silhouette.png",
  gears: "gear.png",
  verified: "verified.png",
  registeredItems: "menu.png",
  engineering: "engineering.png",
  sheets: "paper.png",
  readyStock: "ready-stock.png",
  selection: "selection.png",
  tracking: "tracking.png",
  sales: "sales.png",
  technicalSupport: "technical-support.png",
  user: "user.png",
  cash: "money.png",
  home: "home.png",
  locations: "locations.png",
  teamwork: "teamwork.png",
};

// `strokeWidth` is an override, not a prop most callers touch: the set has one
// weight on purpose. The two places that pass it are a check inside a 10px dot,
// which needs a heavier stroke to read at that size, and a 28px feature glyph,
// which needs a lighter one.
export function Icon({ name, className = "h-5 w-5", strokeWidth }) {
  const file = IMAGES[name];
  if (file) {
    const url = `url(/icons/${file})`;
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 ${className}`}
        style={{
          backgroundColor: "currentColor",
          WebkitMaskImage: url, maskImage: url,
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
          WebkitMaskSize: "contain", maskSize: "contain",
        }}
      />
    );
  }
  const paths = PATHS[name] || PATHS.dot;
  return (
    <svg {...base} strokeWidth={strokeWidth ?? base.strokeWidth} className={className} aria-hidden="true">
      {paths}
    </svg>
  );
}

// ---- console marks ---------------------------------------------------------
//
// The /super console used to ship its OWN inline icon set — a second file, the
// same 24-grid, the same stroke weight, ninety marks that only differed from
// these by being somewhere else. Two hand-rolled sets is one set plus a slow
// divergence: a `search` glyph gets nudged in one file and the two consoles
// stop matching, and nobody notices because nothing imports both.
//
// They are one set now. These are the marks the console needed that the Studio
// had no use for — chart furniture, list controls, theme and status glyphs.
// They are declared as `d` strings rather than JSX because that is the shape
// they arrived in and every one of them is a single path; the map below turns
// them into the same <path> element the entries after it are written as.
//
// Spread FIRST inside PATHS, so an entry the Studio already draws its own way
// (chat, bell, shield, chevrons…) keeps the Studio's drawing.
const CONSOLE_MARKS = {
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  award: "M12 15a7 7 0 100-14 7 7 0 000 14zM8.2 13.9L7 23l5-3 5 3-1.2-9.1",
  bitcoin: "M9 4v16M14 4v16M6 8h8a3 3 0 010 6H6h9a3 3 0 010 6H6",
  box: "M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7.3L12 12l8.7-4.7M12 22V12",
  briefcase: "M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  cart: "M2 3h2.5l2.2 11.2a2 2 0 002 1.6h8.6a2 2 0 002-1.6L21 7H6M9 21a1 1 0 100-2 1 1 0 000 2zM19 21a1 1 0 100-2 1 1 0 000 2z",
  chart: "M3 3v18h18M8 17V9m5 8V5m5 12v-6",
  chevronLeft: "M15 18l-6-6 6-6",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  cloud: "M18 17a4 4 0 00-1.3-7.8A6 6 0 105 15.5M18 17H7",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  copy: "M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2zM5 15H4a2 2 0 01-2-2V3a2 2 0 012-2h10a2 2 0 012 2v1",
  database: "M12 8c5 0 9-1.3 9-3s-4-3-9-3-9 1.3-9 3 4 3 9 3zM3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M17.9 17.9A10.1 10.1 0 0112 20C6 20 2 13 2 13a18.4 18.4 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c6 0 10 7 10 7a18.5 18.5 0 01-2.2 3.2M1 1l22 22M9.9 9.9a3 3 0 004.2 4.2",
  file: "M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7",
  filter: "M22 3H2l8 9.5V19l4 2v-8.5z",
  flag: "M4 21V4M4 4h13l-2.5 4L17 12H4",
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  form: "M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zM7 8h10M7 12h10M7 16h6",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  heart: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21.2l7.7-7.7 1.1-1a5.5 5.5 0 000-7.8z",
  helpCircle: "M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01",
  image: "M3 3h18v18H3zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  invoice: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h4",
  kanban: "M5 3h4v12H5zM10.5 3h4v8h-4zM16 3h4v16h-4z",
  key: "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3",
  layers: "M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  link: "M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  megaphone: "M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1zM15 8.5a4 4 0 010 7M18.5 6a7.5 7.5 0 010 12",
  minus: "M5 12h14",
  monitor: "M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zM8 21h8M12 17v4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  more: "M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z",
  package: "M16.5 9.4L7.5 4.2M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.3 7L12 12l8.7-5M12 22V12",
  palette: "M12 22a10 10 0 010-20c5.5 0 10 3.6 10 8 0 2.8-2.2 5-5 5h-2a2 2 0 00-1.4 3.4A2 2 0 0112 22zM7.5 11a1 1 0 100-2 1 1 0 000 2zM12 8a1 1 0 100-2 1 1 0 000 2zM16.5 11a1 1 0 100-2 1 1 0 000 2z",
  phone: "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.1a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z",
  pie: "M21.2 15.9A10 10 0 118.1 2.8M22 12A10 10 0 0012 2v10z",
  play: "M5 3l14 9-14 9z",
  refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15",
  rocket: "M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2 2 0 00-2.9-.1zM12 15l-3-3a22 22 0 012-3.9A12.9 12.9 0 0122 2c0 2.7-.8 7.5-6 11a22 22 0 01-4 2z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  server: "M4 2h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM4 14h16a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5a1 1 0 011-1zM7 6h.01M7 18h.01",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 004.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  smile: "M12 22a10 10 0 100-20 10 10 0 000 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  sun: "M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  table: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-8-8V4a1 1 0 011-1h8.6l8.4 8.4a2 2 0 010 2zM7.5 8a.5.5 0 100-1 .5.5 0 000 1z",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  tool: "M14.7 6.3a4 4 0 105.4 5.4L21 11l-8 8-1 4-4-4 8-8z",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6",
  trendDown: "M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
  trendUp: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  users: "M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9.5 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  wallet: "M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4h-4z",
  wifiOff: "M1 1l22 22M16.7 11.7A9 9 0 0119 13M5 13a9 9 0 015.3-2.6M2 8.8a16 16 0 014.4-2.7M21.9 8.8a16 16 0 00-6.6-3.3M8.5 16.4a5 5 0 017 0M12 20h.01",
  wizard: "M3 12h4l3-8 4 16 3-8h4",
  x: "M18 6L6 18M6 6l12 12",
  zap: "M13 2L3 14h9l-1 8 10-12h-9z",
};

const consoleMarks = Object.fromEntries(
  // `key` is not strictly needed — fromEntries turns these into an object, so no
  // element is ever a sibling of another — but the rule cannot see that, and a
  // key on a lone element costs nothing.
  Object.entries(CONSOLE_MARKS).map(([name, d]) => [name, <path key={name} d={d} />]),
);

const PATHS = {
  ...consoleMarks,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  services: <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.9 7.2 17l.9-5.4L4.2 7.7l5.4-.8z" />,
  projects: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  vendors: (
    <>
      <path d="M3 9l1-4h16l1 4" />
      <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0111 0" />
      <path d="M16 6.2a3.2 3.2 0 010 6" />
      <path d="M17.5 20a5.5 5.5 0 00-3-4.9" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="4" width="14" height="14" rx="2" />
      <circle cx="8" cy="9" r="1.6" />
      <path d="M5 16l3.5-4 2.5 3 2-2.5L17 16" />
      <path d="M20 8v10a2 2 0 01-2 2H8" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3 20a6 6 0 0112 0" />
      <path d="M14.5 14.2A5 5 0 0121 19" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  external: <path d="M7 17L17 7M9 7h8v8" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" stroke="none" />,
  dot: <circle cx="12" cy="12" r="3" />,
  // The bell body is one stroke from rim to rim, so the clapper below it reads
  // as a separate mark rather than as part of the outline.
  bell: (
    <>
      <path d="M18 8.5a6 6 0 10-12 0c0 4.2-1.2 5.9-2 6.8-.3.4 0 .95.5.95h15c.5 0 .8-.55.5-.95-.8-.9-2-2.6-2-6.8z" />
      <path d="M10.2 19.5a2 2 0 003.6 0" />
    </>
  ),
  checkDouble: (
    <>
      <path d="M1 12l4.5 4.5L14 8" />
      <path d="M9 16.5L10.5 18 19 8" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  ),
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 10v4M18 10v4" />
    </>
  ),
  gears: (
    <>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4" />
      <circle cx="17.5" cy="17.5" r="2" />
      <path d="M17.5 14.2v1M17.5 19.8v1M14.2 17.5h1M19.8 17.5h1" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 014.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  call: (
    <path d="M7 3.5l2.2 4-1.7 1.7a12 12 0 005.3 5.3l1.7-1.7 4 2.2v3.1a1.7 1.7 0 01-1.9 1.7A16.5 16.5 0 013.5 5.4 1.7 1.7 0 015.2 3.5z" />
  ),
  // A speech bubble with a tail — the live-chat launcher. Deliberately empty
  // inside: it sits at 24px in a floating button where ruled "text" lines would
  // only read as noise.
  chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  // Send is an arrow, not a paper plane: the set is stroke-only and a plane at
  // 16px collapses into a smudge, while an arrow stays legible and mirrors
  // cleanly under RTL (the caller flips it).
  send: <path d="M4 12h15M13 6l6 6-6 6" />,
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 18.5V20a1 1 0 001 1h14a1 1 0 001-1v-1.5" />
    </>
  ),
  chevronUp: <path d="M6 15l6-6 6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  // The way back off a full-screen page. Every such page already asked for it
  // by name; nothing ever drew it, so the four back buttons in the studio were
  // rendering the unrecognised-name dot.
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  check: <path d="M4 12l5 5L20 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.2-3.1 7.9-8 9-4.9-1.1-8-4.8-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 114.1 2.2c-.9.7-1.7 1.2-1.7 2.3" />
      <path d="M12 17.2h.01" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19v16H6.5A2.5 2.5 0 004 21.5z" />
      <path d="M8 7h7M8 11h7" />
    </>
  ),
  techService: (
    <>
      <path d="M14.7 6.3a3.7 3.7 0 004.9 4.9l-8.5 8.5a2.2 2.2 0 01-3.1-3.1z" />
      <path d="M6 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </>
  ),
  // Sales sub-section icons. `group` is the three-figure crowd (one forward,
  // two behind) rather than the two-figure `clients` above — Clients is a list
  // of companies, so the fuller group reads as "everyone we sell to".
  group: (
    <>
      <circle cx="5" cy="6.9" r="2.4" />
      <path d="M1.7 16.3a4.4 4.4 0 013.5-2.6" />
      <circle cx="19" cy="6.9" r="2.4" />
      <path d="M22.3 16.3a4.4 4.4 0 00-3.5-2.6" />
      <circle cx="12" cy="7.9" r="3.3" />
      <path d="M6.6 19.5a5.4 5.4 0 0110.8 0" />
    </>
  ),
  // Broadcast: a play mark inside two pairs of arcs radiating from it. The set
  // is stroke-only, so the triangle is an outline rather than the solid glyph.
  live: (
    <>
      <path d="M10.2 9.2l4.6 2.8-4.6 2.8z" />
      <path d="M8 8.5A5.5 5.5 0 008 15.5" />
      <path d="M16 8.5A5.5 5.5 0 0116 15.5" />
      <path d="M5.2 6.2A9 9 0 005.2 17.8" />
      <path d="M18.8 6.2A9 9 0 0118.8 17.8" />
    </>
  ),
  // Projects sub-section icons.
  //
  // Blueprint — a rolled sheet with a floor plan on it. The curl down the left
  // edge is what makes it a drawing rather than a page, and the plan inside is
  // walls plus one room, not ruled text lines: that is the whole difference from
  // `report`, which is a page with writing on it.
  blueprint: (
    <>
      <path d="M7 4.2h13a1.5 1.5 0 011.5 1.5v13.1a1.5 1.5 0 01-1.5 1.5H6a3 3 0 01-3-3V7.2a3 3 0 013-3h1z" />
      <path d="M7 4.2v11H6a3 3 0 00-3 3" />
      <path d="M11 7.8v9.4M11 12.6h7" />
      <rect x="14.6" y="12.6" width="4.4" height="4.6" />
    </>
  ),
  // Tools — a wrench and a screwdriver crossed. Two tools, not one: the studio's
  // Technical section already wears a single wrench (`techService`), and SLA is
  // about upkeep rather than one job.
  tools: (
    <>
      <path d="M17.3 3.2a4.2 4.2 0 00-4.7 6.5l-7.7 7.7a1.9 1.9 0 002.7 2.7l7.7-7.7a4.2 4.2 0 006.5-4.7l-2.8 2.8-2.6-.6-.6-2.6z" />
      <path d="M4.1 3.1l2.6 2.6-1.5 1.5-2.6-2.6a1 1 0 011.5-1.5z" />
      <path d="M6.7 5.7l7 7" />
    </>
  ),
  // Overtime — a clock wearing an OT badge, as in the reference. The clock is
  // deliberately shrunk and the badge enlarged: at the 18px the nav actually
  // renders, two letters inside a small badge collapse into a smudge, so the
  // badge has to be big enough to carry them. The face keeps hands but no tick
  // marks for the same reason.
  overtime: (
    <>
      <circle cx="8.6" cy="8.6" r="6.6" />
      <path d="M8.6 4.5v4.1h2.8" />
      <rect x="10.4" y="11.6" width="12.2" height="10" rx="2.4" />
      <text x="16.5" y="19.2" fontSize="8.6" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700"
        textAnchor="middle" fill="currentColor" stroke="none">OT</text>
    </>
  ),
  // Technical sub-section icons.
  //
  // Report — a page being WRITTEN: folded corner, ruled lines, pencil laid over
  // the right edge. The pencil is what separates it from a plain document, so it
  // crosses the page outline rather than sitting politely beside it.
  report: (
    <>
      <path d="M3.8 3.5h7.4l3.3 3.3V20a1 1 0 01-1 1H4.8a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
      <path d="M11.2 3.5v3.3h3.3" />
      <path d="M6.8 11.5h4.5M6.8 14.5h3.5" />
      <path d="M18.6 7.1l2.3 2.3-6.4 6.4-3 .7.7-3z" />
    </>
  ),
  // Request for proposal — a document ANSWERED: the page carries its two bars,
  // and the reply is the check badge overlapping its lower corner. Drawn clear
  // of the page's outline, since a stroke-only set has no white ring to punch
  // the badge out with.
  rfp: (
    <>
      <path d="M14.5 12.2V5a2 2 0 00-2-2h-7a2 2 0 00-2 2v11a2 2 0 002 2h5.7" />
      <path d="M6.8 7h5M6.8 10.5h2.5" />
      <circle cx="17.2" cy="16.2" r="4.6" />
      <path d="M15.2 16.3l1.4 1.4 2.8-2.9" />
    </>
  ),
  // The notches are what make this a ticket rather than a card, so they carry
  // the shape; the stub's perforation is dashed for the same reason.
  ticket: (
    <>
      <path d="M3 10V9a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 9v1a2 2 0 000 4v1a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16v-1a2 2 0 000-4z" />
      <path d="M15 7.5v2M15 11v2M15 14.5v2" />
      <path d="M6.5 10.8h4M6.5 13.4h5" />
    </>
  ),
};

// Every name the set answers to, drawn or masked. Exported so a caller can
// assert against it instead of discovering a typo as a stray dot on the page.
export const iconNames = Object.freeze(
  [...new Set([...Object.keys(PATHS), ...Object.keys(IMAGES)])].sort(),
);
