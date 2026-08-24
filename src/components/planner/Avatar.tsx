'use client';

import * as React from 'react';
import type { Resource } from '@/components/planner/lib/types';
import { cn, readableTextOn } from '@/components/planner/lib/utils';
import { Tooltip } from '@/components/planner/ui/primitives';

export function Avatar({
  resource,
  size = 20,
  className,
  ring,
}: {
  resource: Resource;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <Tooltip label={`${resource.name} - ${resource.role}`}>
      <span
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none',
          ring && 'ring-2 ring-white',
          className,
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: resource.color,
          color: readableTextOn(resource.color),
          fontSize: Math.max(8, Math.round(size * 0.42)),
        }}
      >
        {resource.initials}
      </span>
    </Tooltip>
  );
}

/** Overlapping stack, capped with a "+n" chip like the Asana header. */
export function AvatarStack({
  resources,
  size = 20,
  max = 3,
  className,
}: {
  resources: Resource[];
  size?: number;
  max?: number;
  className?: string;
}) {
  const shown = resources.slice(0, max);
  const overflow = resources.length - shown.length;

  return (
    <span className={cn('flex items-center', className)}>
      {shown.map((r, i) => (
        <span key={r.id} style={{ marginInlineStart: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar resource={r} size={size} ring />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white"
          style={{
            width: size,
            height: size,
            marginInlineStart: -size * 0.28,
            fontSize: Math.max(8, Math.round(size * 0.4)),
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

export function EmptyAvatar({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      +
    </span>
  );
}
