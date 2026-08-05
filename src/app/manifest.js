export default function manifest() {
  return {
    name: "MegaTech Arabia",
    short_name: "MegaTech",
    description:
      "Turnkey audio-visual, lighting, IT and collaborative workspace systems integration across Saudi Arabia.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#031f5d",
    lang: "en",
    dir: "ltr",
    categories: ["business", "technology"],
    icons: [
      { src: "/brand/logo-icon.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
