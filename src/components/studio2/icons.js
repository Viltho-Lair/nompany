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

export function Icon({ name, className = "h-5 w-5" }) {
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
  techService: (
    <>
      <path d="M14.7 6.3a3.7 3.7 0 004.9 4.9l-8.5 8.5a2.2 2.2 0 01-3.1-3.1z" />
      <path d="M6 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </>
  ),
};
