export default function manifest() {
  return {
    name: "nompany — modular ERP for companies",
    short_name: "nompany",
    description:
      "nompany is a modular ERP that runs a company's whole operation from one platform — Sales, Projects, Inventory, HR, Finance and live statistics — paying only for the modules it uses.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/brand/logo-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/logo-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // A SEPARATE FILE, not the same one relabelled. A maskable icon is
      // cropped by the launcher — a circle on Android — and only the centre
      // 80% survives; the mark is taller than it is wide, so pointing this at
      // the edge-to-edge icon cuts its top and bottom points off.
      { src: "/brand/logo-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
