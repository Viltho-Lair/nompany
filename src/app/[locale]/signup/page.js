import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";
import { enabledProviders } from "@/lib/oauth";
import SignupForm from "@/components/public/SignupForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.auth.signupTitle, description: dict.auth.signupSubtitle };
}

export default async function SignupPage({ params }) {
  const { locale } = await params;
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const t = dict.auth;

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-steel-900 px-5 py-24">
      <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">{t.signupTitle}</h1>
          <p className="mt-2 text-sm text-white/70">{t.signupSubtitle}</p>
        </div>
        <div className="rounded-geex border border-steel-200 bg-white p-7 shadow-[0_30px_70px_-40px_rgba(2,6,23,0.6)] dark:border-white/10 dark:bg-steel-800">
          <SignupForm locale={locale} dict={dict} providers={enabledProviders()} />
        </div>
      </div>
    </section>
  );
}
