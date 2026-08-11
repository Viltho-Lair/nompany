import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";
import ForgotFlow from "@/components/public/ForgotFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reset your password", robots: { index: false, follow: false } };

// Password recovery. Also the way an OAuth user gives themselves a password:
// they signed in through Google/Microsoft and never had one to begin with.
export default async function ForgotPage({ params, searchParams }) {
  const { locale } = await params;
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const sp = await searchParams;

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-steel-900 px-5 py-24">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">
            {dict.auth?.forgotTitle || "Forgot your password?"}
          </h1>
          <p className="mt-2 text-sm text-white/70">It happens. We'll get you back in.</p>
        </div>
        <div className="rounded-geex border border-steel-200 bg-white p-7 shadow-[0_30px_70px_-40px_rgba(2,6,23,0.6)] dark:border-white/10 dark:bg-steel-800">
          <ForgotFlow locale={locale} initialEmail={String(sp?.email || "")} />
        </div>
      </div>
    </section>
  );
}
