// Line icons drawn to a common 24x24 grid, using currentColor so they
// inherit brand colour from the parent.
const paths = {
  av: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
      <path d="M8 20.5h8M12 16.5v4" />
      <path d="M9.5 10.2l3.2 1.9-3.2 1.9z" />
    </>
  ),
  lighting: (
    <>
      <path d="M9 15.5a5 5 0 1 1 6 0c-.7.5-1 1.2-1 2v.5h-4v-.5c0-.8-.3-1.5-1-2z" />
      <path d="M10 20.5h4M10.5 22.5h3" />
    </>
  ),
  it: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M8 20.5h8M9 16.5l-.6 4M15 16.5l.6 4" />
      <path d="M7.5 8h9M7.5 11h6" />
    </>
  ),
  furniture: (
    <>
      <path d="M4 10.5V7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v3" />
      <path d="M3 10.5h18v5H3zM4.5 15.5v3M19.5 15.5v3" />
    </>
  ),
  design: (
    <>
      <path d="M4 20l3.5-1 9-9-2.5-2.5-9 9z" />
      <path d="M14 6l2.5 2.5M15.5 4.5L19 8l-2 2-3.5-3.5z" />
    </>
  ),
  commissioning: (
    <>
      <path d="M4 12.5l4 4 8-9" />
      <path d="M20 6.5l-3 3.4" />
    </>
  ),
};

export default function ServiceIcon({ name, className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] || paths.av}
    </svg>
  );
}
