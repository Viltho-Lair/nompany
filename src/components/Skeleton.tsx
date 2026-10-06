// Reusable loading placeholder. Renders a pulsing neutral block so the UI never
// flashes wrong content while an `isLoading` / unknown state resolves — compose
// the size + shape via `className` (e.g. "h-9 w-20"). Use `bg` to override the
// tone on dark surfaces (e.g. the nav overlay). Respects reduced-motion.
//
// Pattern: while the value is unknown (e.g. `company === undefined`, or a
// `loaded` flag is false), render <Skeleton/> instead of guessing a state.
export default function Skeleton({
  className = "",
  rounded = "rounded-md",
  bg = "bg-steel-200/70 dark:bg-white/10",
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse motion-reduce:animate-none ${bg} ${rounded} ${className}`}
    />
  );
}
