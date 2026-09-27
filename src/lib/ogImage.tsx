import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE } from "./seo";
import { claimText } from "@/shared/marketing/claims";
import { heroCopy } from "@/shared/marketing/hero";

// Shared Open Graph / Twitter card renderer. English-branded so it renders
// with the built-in Latin font (no external Arabic font needed) and works for
// both locales. 1200x630 is the standard social-share size, and it is
// `seo.ts`'s constant because the `og:image` tags there declare it too.
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

// IN THE SITE'S DESIGN (27/09/2026): the near-black ground, one violet glow,
// and the site's own words. The headline is the hero's; the two lines around it
// are REGISTERED claims (shared/marketing/claims) rather than a tagline typed
// here — the card it replaced said "Modular ERP · pay for what you use", which
// nothing registered and nothing checked.
export function renderCard() {
  const hero = heroCopy("en");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(60% 80% at 85% 10%, rgba(139,124,255,0.45), rgba(139,124,255,0) 60%), radial-gradient(50% 60% at 0% 100%, rgba(76,60,190,0.35), rgba(76,60,190,0) 70%), #07070a",
          color: "#ececf1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: "#c9c2ff",
              boxShadow: "0 0 24px 6px rgba(139,124,255,0.6)",
            }}
          />
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 600, letterSpacing: "-0.5px" }}>nompany</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 20px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              fontSize: "22px",
              color: "rgba(236,236,241,0.8)",
            }}
          >
            {claimText("free-tier", "en")}
          </div>
          <div style={{ display: "flex", fontSize: "76px", fontWeight: 500, lineHeight: 1.04, letterSpacing: "-2.5px", maxWidth: "980px" }}>
            {hero.h1}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "25px", color: "rgba(236,236,241,0.6)" }}>
          {claimText("live-departments", "en")} · {claimText("bilingual-rtl", "en")}
        </div>
      </div>
    ),
    { ...size }
  );
}
