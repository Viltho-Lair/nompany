// Just "Studio" — the root layout's template `%s · {siteName}` supplies the
// suffix. Setting the fully-qualified title here fed it into the template a
// second time and produced "Studio · MegaTech Arabia · MegaTech Arabia".
export const metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

import AppDialogHost from "@/components/studio/AppDialogHost";

// Pass-through so the login page (outside the (panel) group) doesn't get the
// authenticated shell. The (panel) layout adds the sidebar/topbar. The dialog
// host is mounted here so every studio route (panel + full-screen builder/live)
// gets the in-app confirm/alert modal.
export default function StudioLayout({ children }) {
  return (
    <>
      {children}
      <AppDialogHost />
    </>
  );
}
