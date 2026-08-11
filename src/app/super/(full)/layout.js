// Full-bleed screens: sign-in, the auth variants, and the error/maintenance
// states. No sidebar, no header — just the tokenised surface.
export default function FullLayout({ children }) {
  return <div className="admindek ad-scope flex min-h-screen">{children}</div>;
}
