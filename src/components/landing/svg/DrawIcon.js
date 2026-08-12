"use client";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";
const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};
const stroke = {
    hidden: { pathLength: 0, opacity: 0 },
    show: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 1.1, ease: EASE_OUT_EXPO },
            opacity: { duration: 0.15 },
        },
    },
};
export function DrawIcon({ shapes, size = 34, color = "currentColor", className = "", }) {
    const reduceMotion = useReducedMotion();
    return (<motion.svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className} variants={container} 
    // `whileInView` + `once` → the IntersectionObserver disconnects after
    // the first trigger, so scrolling past costs nothing.
    initial={reduceMotion ? "show" : "hidden"} whileInView="show" viewport={{ once: true, amount: 0.6 }}>
      {shapes.map((shape, i) => {
            // `key` is passed explicitly below — never spread it (React warns).
            const common = {
                stroke: color,
                strokeWidth: 1.7,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                variants: stroke,
            };
            if (shape.type === "circle") {
                return (<motion.circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...common}/>);
            }
            if (shape.type === "line") {
                return (<motion.line key={i} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...common}/>);
            }
            return <motion.path key={i} d={shape.d} {...common}/>;
        })}
    </motion.svg>);
}
