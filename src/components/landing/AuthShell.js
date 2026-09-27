import { Geist } from "next/font/google";
import { AuthScene } from "@/components/landing/site/pages/auth/AuthScene";

/* ==================================================================
   Full-screen frame for the auth screens — /login, /signup, /forgot —
   in the public site's design (27/09/2026): dark ground, the home page's
   field behind a glass card, Geist for English and Readex for Arabic.

   A SERVER COMPONENT, so it can load Geist. These three pages are not in
   the `(site)` route group and so do not get its font; loading it here
   keeps it off every other page of the product the way the group's own
   layout does. The scene itself is `site/pages/auth/AuthScene`.

   Deliberately has no header and no footer — the only chrome is the mark
   (the way back to the landing) and a language switch. `Nav` and `Footer`
   suppress themselves on these routes.

   DIRECTION FOLLOWS THE LOCALE, because the auth copy is already
   translated — /ar/login renders `dict.auth` in Arabic. It used to sit in
   a hardcoded `dir="ltr"` frame, so the Arabic read left-to-right: the
   label on the wrong side of every field, the OTP "resend" adrift.

   The console's sign-in (/super) has its own AuthShell in
   `app/super/_components/auth`, and never came through this one.
================================================================== */
const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--f-geist" });

export default function AuthShell({ locale = "en", title, subtitle, children, aside }) {
  return (
    <div className={geist.variable}>
      <AuthScene locale={locale} title={title} subtitle={subtitle} aside={aside}>
        {children}
      </AuthScene>
    </div>
  );
}
