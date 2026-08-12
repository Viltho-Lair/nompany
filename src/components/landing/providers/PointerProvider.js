"use client";
import { createContext, useContext, useEffect, useMemo, useState, } from "react";
import { motionValue } from "motion/react";
const PointerContext = createContext(null);
export function PointerProvider({ children }) {
    // `useState` initialiser keeps the same MotionValue instances across renders.
    const [value] = useState(() => ({
        x: motionValue(0),
        y: motionValue(0),
        nx: motionValue(0),
        ny: motionValue(0),
        active: motionValue(0),
    }));
    useEffect(() => {
        // Coarse pointers (touch) get no cursor effects at all.
        if (window.matchMedia("(pointer: coarse)").matches)
            return;
        let frame = 0;
        let lastX = 0;
        let lastY = 0;
        const commit = () => {
            frame = 0;
            const w = window.innerWidth || 1;
            const h = window.innerHeight || 1;
            value.x.set(lastX);
            value.y.set(lastY);
            value.nx.set(lastX / w - 0.5);
            value.ny.set(lastY / h - 0.5);
            if (value.active.get() !== 1)
                value.active.set(1);
        };
        // Coalesce every move event into at most one write per animation frame.
        const onMove = (e) => {
            lastX = e.clientX;
            lastY = e.clientY;
            if (!frame)
                frame = requestAnimationFrame(commit);
        };
        const onLeave = () => {
            value.nx.set(0);
            value.ny.set(0);
            value.active.set(0);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerleave", onLeave);
        return () => {
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerleave", onLeave);
            if (frame)
                cancelAnimationFrame(frame);
        };
    }, [value]);
    return (<PointerContext.Provider value={value}>{children}</PointerContext.Provider>);
}
/** Read the shared cursor MotionValues. Safe to call outside the provider. */
export function usePointer() {
    const ctx = useContext(PointerContext);
    // Fallback keeps components usable in isolation (e.g. Storybook/tests).
    const fallback = useMemo(() => ({
        x: motionValue(0),
        y: motionValue(0),
        nx: motionValue(0),
        ny: motionValue(0),
        active: motionValue(0),
    }), []);
    return ctx ?? fallback;
}
