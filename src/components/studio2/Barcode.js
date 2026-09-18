// A PRINTABLE CODE 128 BARCODE of a reference (shared/barcode). SVG, so it is
// sharp at any printer's resolution; black on white whatever the theme, because
// a scanner reads contrast, not the studio's palette.
import { code128 } from "@/shared/barcode";

const QUIET = 10;

export default function Barcode({ value, height = 40, module = 1.5, showText = true, className = "" }) {
  const text = String(value || "");
  const widths = code128(text);
  if (!widths) return null;
  const total = widths.reduce((s, w) => s + w, 0) + QUIET * 2;
  let x = QUIET;
  const bars = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height / module} />);
    x += w;
  });
  return (
    <figure className={`inline-flex flex-col items-center ${className}`} aria-label={text}>
      <svg role="img" aria-label={text} width={total * module} height={height}
        viewBox={`0 0 ${total} ${height / module}`} preserveAspectRatio="none" shapeRendering="crispEdges"
        style={{ background: "#fff" }}>
        <g fill="#000">{bars}</g>
      </svg>
      {showText && <figcaption className="mt-0.5 font-mono text-[10px] tracking-widest text-black">{text}</figcaption>}
    </figure>
  );
}
