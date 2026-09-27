"use client";
import { Fragment, useEffect, useRef } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { screenSrc } from "@/components/landing/showcase/ScreenShot";
import { useSite } from "./locale";

// Strong ease-out for anything entering: it moves at once, which is the moment
// the eye is on it, and spends its time settling.
export const EASE = [0.23, 1, 0.32, 1];
// Stiff and well damped. It arrives quickly and stops without a wobble, and
// being a spring it keeps its velocity if it is retargeted halfway.
export const SPRING = { type: "spring", stiffness: 210, damping: 30, mass: 0.9 };
export const SPRING_SOFT = { type: "spring", stiffness: 90, damping: 22, mass: 1.1 };

/** The same enter for every "arrives out of focus and settles" moment. */
export function focusTransition(delay = 0, spring = SPRING) {
  return {
    ...spring,
    delay,
    opacity: { duration: 0.55, ease: EASE, delay },
    filter: { duration: 0.8, ease: EASE, delay },
  };
}

/* HIDDEN BY CSS, NEVER BY MOTION'S `initial`.
   ------------------------------------------------------------------
   Motion writes `initial` into the SERVER-RENDERED style attribute, so an
   element that starts at opacity 0 is `style="opacity:0"` in the HTML that a
   crawler which does not run JavaScript reads — Google renders script, and
   ChatGPT's, Claude's and Perplexity's crawlers do not. So nothing here has a
   hidden `initial`. The server renders every element settled; the boot script
   in `(site)/layout.js` marks <html> before first paint (only when script runs
   and motion is allowed), and SiteShell's rule hides `[data-sm]` under that
   mark. The animation then runs from KEYFRAMES, whose first frame is the hidden
   state. If the bundle never arrives, the boot script takes the mark away and
   the page is simply still.

   The keyframe objects are module constants on purpose: a fresh object on every
   render reads to Motion as a new target and would restart the animation. */
export const RISE = { opacity: [0, 1], y: [28, 0], filter: ["blur(10px)", "blur(0px)"] };
export const RISE_SMALL = { opacity: [0, 1], y: [14, 0], filter: ["blur(10px)", "blur(0px)"] };
export const CELL_IN = { opacity: [0, 1], y: [48, 0], scale: [0.97, 1], filter: ["blur(12px)", "blur(0px)"] };

/** Props that reveal an element the first time it scrolls into view. */
export function useInViewReveal(delay = 0, keyframes = RISE, amount = 0.3) {
  const reduce = useReducedMotion();
  return {
    "data-sm": "",
    initial: false,
    whileInView: reduce ? undefined : keyframes,
    viewport: { once: true, amount },
    transition: focusTransition(delay),
  };
}

/**
 * Props that reveal an element once the page has been counted in. Spread them
 * on a PLAIN element, not a motion one.
 *
 * IMPERATIVE, NOT AN `animate` PROP: an `animate` that changes from undefined
 * to keyframes after an `initial={false}` mount never ran — the hero sat at the
 * boot rule's opacity 0 with no inline style at all, while `whileInView` on the
 * same page worked. Animating the element directly when `ready` turns true has
 * no such ambiguity, and it is a plain element so no motion component is also
 * writing its transform.
 */
export function useReadyReveal(delay = 0, keyframes = RISE_SMALL, spring = SPRING) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { ready } = useSite();
  useEffect(() => {
    if (!ready || reduce || !ref.current) return undefined;
    const controls = animate(ref.current, keyframes, focusTransition(delay, spring));
    return () => controls.stop();
  }, [ready, reduce, keyframes, delay, spring]);
  return { ref, "data-sm": "" };
}

/** A paragraph that is read into existence by the scroll, word by word. */
export function ScrollWords({ text, className = "" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <ScrollWord p={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={reduce}>
            {w}
          </ScrollWord>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </p>
  );
}

function ScrollWord({ p, range, still, children }) {
  const opacity = useTransform(p, range, [0.18, 1]);
  return <motion.span style={still ? undefined : { opacity }}>{children}</motion.span>;
}

/**
 * The call to action. Magnetic: the shell follows the cursor a little and the
 * label a little more, so the label arrives first and the shell trails it.
 * Mouse only; a finger has no hover to be attracted by.
 */
export function Cta({ href, children, variant = "primary", size = "md", className = "" }) {
  const reduce = useReducedMotion();
  const rect = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });
  const lx = useTransform(sx, (v) => v * 0.45);
  const ly = useTransform(sy, (v) => v * 0.45);

  function enter(e) {
    rect.current = e.currentTarget.getBoundingClientRect();
  }
  function move(e) {
    if (reduce || e.pointerType !== "mouse" || !rect.current) return;
    const r = rect.current;
    x.set((e.clientX - (r.left + r.width / 2)) * 0.32);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.4);
  }
  function leave() {
    x.set(0);
    y.set(0);
  }

  const sizing = size === "sm" ? "h-9 px-4 text-[13px]" : "h-12 px-6 text-[15px]";
  const look =
    variant === "primary"
      ? "bg-[#ececf1] text-[#0b0b10] hover:bg-white"
      : "bg-white/[0.05] text-[#ececf1] ring-1 ring-inset ring-white/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.09]";

  return (
    <motion.a
      href={href}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
      whileTap={{ scale: 0.97 }}
      style={{ x: sx, y: sy }}
      className={`group relative inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a] ${sizing} ${look} ${className}`}
    >
      <motion.span style={{ x: lx, y: ly }} className="inline-flex items-center gap-2">
        {children}
      </motion.span>
    </motion.a>
  );
}

/** A real product screen in a pane of glass. `children` is the picture. */
export function GlassWindow({ url, children, className = "" }) {
  return (
    <div
      className={`relative rounded-3xl bg-white/[0.035] p-2 ring-1 ring-inset ring-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_50px_120px_-30px_rgba(24,16,80,0.85)] ${className}`}
    >
      {url ? (
        <div className="flex h-8 items-center px-3" dir="ltr">
          <span className="truncate font-mono text-[11px] text-white/40">{url}</span>
        </div>
      ) : null}
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#0c0c12]">{children}</div>
    </div>
  );
}

/** One of the product's own screens, in the reader's language, dark. */
export function Shot({ name, alt, priority = false, sizes = "(min-width: 1024px) 55vw, 100vw", className = "" }) {
  const { locale } = useSite();
  return (
    <Image
      src={screenSrc(name, locale, "dark")}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover object-top ${className}`}
    />
  );
}
