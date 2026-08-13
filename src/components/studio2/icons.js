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
};

export function Icon({ name, className = "h-5 w-5" }) {
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
    <svg {...base} className={className} aria-hidden="true">
      {paths}
    </svg>
  );
}

const PATHS = {
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
  dot: <circle cx="12" cy="12" r="3" />,
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
