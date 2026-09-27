import Link from "next/link";
import { Geist } from "next/font/google";
import BackButton from "@/components/public/BackButton";
import { LogoMark } from "@/components/landing/Logo";

// THE 404, IN THE SITE'S DESIGN (27/09/2026) — one view for both not-found
// files (the locale one and the root one), so a wrong address looks like the
// site it was typed into. It sits outside the (site) route group, so it loads
// Geist itself, and it is a server component: the words are in the HTML.
const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--f-geist" });

export function NotFoundView({ locale, nf, dir }) {
  const home = `/${locale}`;
  const rtl = dir === "rtl";
  return (
    <main
      dir={dir}
      lang={locale}
      className={`${geist.variable} relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#07070a] px-6 py-24 text-center text-[#ececf1]`}
      style={{ fontFamily: rtl ? "var(--f-readex), system-ui, sans-serif" : "var(--f-geist), var(--f-readex), system-ui, sans-serif" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(55% 60% at 50% 35%, rgba(139,124,255,0.22), rgba(139,124,255,0) 70%)" }}
      />
      <Link href={home} className="flex items-center gap-2.5" aria-label="nompany">
        <LogoMark size={28} />
        <span className="text-[15px] font-semibold tracking-[-0.02em]" dir="ltr">
          nompany
        </span>
      </Link>
      <p className="mt-14 text-[7rem] font-medium leading-none tracking-[-0.06em] text-transparent sm:text-[10rem]" style={{ WebkitTextStroke: "1px rgba(201,194,255,0.55)" }} dir="ltr">
        {nf.code}
      </p>
      <h1 className="mt-4 text-[2rem] font-medium tracking-[-0.035em] sm:text-[2.8rem] rtl:tracking-normal">{nf.title}</h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-[17px] leading-relaxed text-white/60">{nf.message}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={home}
          className="inline-flex h-12 items-center rounded-full bg-[#ececf1] px-6 text-[15px] font-medium text-[#0b0b10] transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97]"
        >
          {nf.backHome}
        </Link>
        <BackButton
          label={nf.goBack}
          fallbackHref={home}
          className="inline-flex h-12 items-center rounded-full bg-white/[0.05] px-6 text-[15px] font-medium text-[#ececf1] ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.09]"
        />
      </div>
    </main>
  );
}
