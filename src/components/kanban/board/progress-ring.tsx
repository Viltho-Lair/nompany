"use client";

import * as React from "react";

import { cn } from "@/components/kanban/lib/utils";

interface ProgressRingProps {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** Renders "3/5" in the middle instead of a check when incomplete. */
  showCount?: boolean;
}

/**
 * Subtask completion as a stroke-dashoffset ring.
 *
 * NOMPANY SEAM: framer-motion drove the offset spring in the original. It is
 * fenced out of the studio bundle, so the sweep is now a plain CSS transition
 * on `stroke-dashoffset` — the ring still animates when a subtask is ticked,
 * with no motion library.
 */
export function ProgressRing({
  done,
  total,
  size = 34,
  stroke = 3,
  className,
  showCount = true,
}: ProgressRingProps) {
  const ratio = total === 0 ? 0 : done / total;
  const complete = total > 0 && done === total;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = React.useId();

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${done} of ${total} subtasks complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={complete ? "#10b981" : "#8b5cf6"} />
            <stop offset="100%" stopColor={complete ? "#34d399" : "#38bdf8"} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/10"
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        {complete ? (
          <svg
            key="check"
            viewBox="0 0 24 24"
            className="size-4 stroke-emerald-500 animate-in zoom-in-50 duration-300"
            fill="none"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          showCount && (
            <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">
              {done}/{total}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/** Flat variant used inside the task dialog header. */
export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const ratio = total === 0 ? 0 : done / total;
  const complete = total > 0 && done === total;

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-foreground/10",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r",
          complete
            ? "from-emerald-500 to-teal-400"
            : "from-[#8b5cf6] to-sky-400",
        )}
        style={{
          width: `${ratio * 100}%`,
          transition: "width 500ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}
