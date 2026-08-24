'use client';

import * as React from 'react';
import type { ComputedTask } from '@/components/planner/lib/types';
import type { ScheduleResult } from '@/components/planner/lib/schedule/engine';
import type { Timeline } from '@/components/planner/lib/timeline';
import { ROW_HEIGHT } from '@/components/planner/lib/timeline';

/* ------------------------------------------------------------------ *
 * Dependency arrows.
 *
 * One SVG overlay for the whole chart. Each link is routed as an elbow
 * with rounded corners, using the anchor pair that matches its type:
 *
 *   FS  predecessor finish -> successor start
 *   SS  predecessor start  -> successor start
 *   FF  predecessor finish -> successor finish
 *   SF  predecessor start  -> successor finish
 *
 * When the successor sits to the LEFT of its anchor (a lead, or a
 * pinned date that violates the link) the route detours through the
 * lane between the two rows instead of drawing a line back through the
 * bars.
 * ------------------------------------------------------------------ */

const STUB = 11; // how far the line leaves a bar before it turns
const CORNER = 4; // elbow corner radius
const BAR_HALF = 11;

interface Props {
  schedule: ScheduleResult;
  timeline: Timeline;
  rows: ComputedTask[];
  selectedId: string | null;
  showCriticalPath: boolean;
}

interface Link {
  key: string;
  d: string;
  arrow: { x: number; y: number; dir: 1 | -1 };
  highlighted: boolean;
  critical: boolean;
  problem: boolean;
}

export function DependencyLayer({
  schedule,
  timeline,
  rows,
  selectedId,
  showCriticalPath,
}: Props) {
  const links = React.useMemo(() => {
    const rowIndex = new Map(rows.map((t, i) => [t.id, i]));
    const out: Link[] = [];

    for (const succ of rows) {
      const si = rowIndex.get(succ.id);
      if (si === undefined) continue;

      for (const dep of succ.dependencies) {
        const pred = schedule.byId.get(dep.predecessorId);
        if (!pred) continue;
        const pi = rowIndex.get(pred.id);
        if (pi === undefined) continue; // predecessor is inside a collapsed branch

        const fromFinish = dep.type === 'FS' || dep.type === 'FF';
        const toStart = dep.type === 'FS' || dep.type === 'SS';

        const sx = timeline.x(fromFinish ? pred.endDate : pred.startDate);
        const sy = pi * ROW_HEIGHT + ROW_HEIGHT / 2;
        const tx = timeline.x(toStart ? succ.startDate : succ.endDate);
        const ty = si * ROW_HEIGHT + ROW_HEIGHT / 2;

        // Which way the line leaves the predecessor and enters the successor.
        const outDir: 1 | -1 = fromFinish ? 1 : -1;
        const inDir: 1 | -1 = toStart ? 1 : -1;

        const points = routeElbow(sx, sy, tx, ty, outDir, inDir);

        out.push({
          key: `${pred.id}->${succ.id}-${dep.type}`,
          d: roundedPath(points, CORNER),
          arrow: {
            x: tx - inDir * 1,
            y: ty,
            dir: inDir,
          },
          highlighted:
            selectedId === succ.id || selectedId === pred.id,
          critical: showCriticalPath && pred.critical && succ.critical,
          problem: succ.issues.length > 0,
        });
      }
    }
    return out;
  }, [rows, schedule.byId, timeline, selectedId, showCriticalPath]);

  const height = rows.length * ROW_HEIGHT + ROW_HEIGHT + 24;

  return (
    <svg
      className="pointer-events-none absolute start-0 top-0 z-10 overflow-visible"
      width={timeline.width}
      height={height}
    >
      {links.map((link) => {
        const stroke = link.problem
          ? '#F59E0B'
          : link.critical
            ? '#E8384F'
            : link.highlighted
              ? '#4573D2'
              : '#B7BFC9';
        return (
          <g key={link.key}>
            <path
              d={link.d}
              fill="none"
              stroke={stroke}
              strokeWidth={link.highlighted || link.critical ? 1.6 : 1.1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* arrowhead drawn inline so it inherits the per-link colour */}
            <path
              d={arrowHead(link.arrow.x, link.arrow.y, link.arrow.dir)}
              fill={stroke}
            />
          </g>
        );
      })}
    </svg>
  );
}

type Point = [number, number];

/**
 * Route from a bar edge to another bar edge.
 * `outDir` +1 leaves rightwards, -1 leftwards; `inDir` +1 arrives from the
 * left (pointing right), -1 arrives from the right.
 */
function routeElbow(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  outDir: 1 | -1,
  inDir: 1 | -1,
): Point[] {
  const exit = sx + outDir * STUB;
  const entry = tx - inDir * STUB;

  // Same row: a straight shot, no elbow needed.
  if (Math.abs(sy - ty) < 1) {
    return [
      [sx, sy],
      [tx, ty],
    ];
  }

  // Enough clearance to turn once and come straight in.
  const forward = inDir === 1 ? entry >= exit : entry <= exit;
  if (forward) {
    const mid = inDir === 1 ? Math.max(exit, entry) : Math.min(exit, entry);
    return [
      [sx, sy],
      [mid, sy],
      [mid, ty],
      [tx, ty],
    ];
  }

  // Otherwise detour through the lane between the two rows.
  const lane = sy + (ty > sy ? ROW_HEIGHT / 2 : -ROW_HEIGHT / 2);
  return [
    [sx, sy],
    [exit, sy],
    [exit, lane],
    [entry, lane],
    [entry, ty],
    [tx, ty],
  ];
}

/** Build an SVG path with rounded corners through a polyline. */
function roundedPath(points: Point[], radius: number): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];

    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, inLen / 2, outLen / 2);

    if (r < 0.5) {
      d += ` L ${cx} ${cy}`;
      continue;
    }

    const ix = cx - ((cx - px) / (inLen || 1)) * r;
    const iy = cy - ((cy - py) / (inLen || 1)) * r;
    const ox = cx + ((nx - cx) / (outLen || 1)) * r;
    const oy = cy + ((ny - cy) / (outLen || 1)) * r;

    d += ` L ${ix} ${iy} Q ${cx} ${cy} ${ox} ${oy}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

function arrowHead(x: number, y: number, dir: 1 | -1): string {
  const len = 5;
  const half = 3.2;
  return [
    `M ${x} ${y}`,
    `L ${x - dir * len} ${y - half}`,
    `L ${x - dir * len} ${y + half}`,
    'Z',
  ].join(' ');
}

export { BAR_HALF };
