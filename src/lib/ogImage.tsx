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
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
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
            n
          </div>
          <div style={{ display: "flex", fontSize: "30px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            nompany
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "3px",
              color: "#93c5fd",
            }}
          >
            MODULAR ERP · PAY FOR WHAT YOU USE
          </div>
          <div style={{ display: "flex", fontSize: "62px", fontWeight: 800, lineHeight: 1.1, maxWidth: "980px" }}>
            Run every department from one platform
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "26px", color: "rgba(255,255,255,0.82)" }}>
          Sales · Projects · Inventory · HR · Finance — add only the modules you use.
        </div>
      </div>
    ),
    { ...size }
  );
}
