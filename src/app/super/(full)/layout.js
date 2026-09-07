// Full-bleed screens: the sign-in and the questionnaire app. No sidebar, no
// header — just the tokenised surface.
//
// It used to hold the template's eighteen auth variants and nine
// error/maintenance states as well; those are deleted, so what is left is the
// two screens that do something.
export default function FullLayout({ children }) {
  return <div className="admindek ad-scope flex min-h-screen">{children}</div>;
}
