import { ImageResponse } from "next/og";

// Shared Open Graph / Twitter card renderer. English-branded so it renders
// with the built-in Latin font (no external Arabic font needed) and works for
// both locales. 1200x630 is the standard social-share size.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function renderCard() {
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
          background: "linear-gradient(135deg, #031f5d 0%, #0a3fa8 60%, #1e6ff0 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.14)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", fontSize: "30px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            MegaTech Arabia
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "3px",
              color: "#9ec3ff",
            }}
          >
            SYSTEMS INTEGRATION · SINCE 2009
          </div>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 800, lineHeight: 1.1, maxWidth: "980px" }}>
            Audio-Visual, Lighting &amp; IT Systems Integration
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "26px", color: "rgba(255,255,255,0.82)" }}>
          Turnkey technology across Saudi Arabia — surveyed, designed, commissioned.
        </div>
      </div>
    ),
    { ...size }
  );
}
