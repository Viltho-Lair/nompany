"use client";

import * as React from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { boardDict, boardWord } from "@/shared/studio/board";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import type { SxProps, Theme } from "@mui/material/styles";

import { cn } from "@/components/kanban/lib/utils";
import { PRIORITY_META, type Member, type Priority } from "@/components/kanban/lib/types";

/* -------------------------------------------------------------------------- */
/*                               priority badge                               */
/* -------------------------------------------------------------------------- */

export const PriorityBadge = React.memo(function PriorityBadge({
  priority,
  className,
  compact,
}: {
  priority: Priority;
  className?: string;
  compact?: boolean;
}) {
  const tr = boardDict(useStudioLocale());
  const meta = PRIORITY_META[priority];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot, meta.glow)} />
      {!compact && boardWord(tr, meta.labelKey)}
    </span>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    tags                                    */
/* -------------------------------------------------------------------------- */

export const TagPill = React.memo(function TagPill({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex items-center rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-border/50 transition-colors group-hover/card:text-foreground/80">
      #{label}
    </span>
  );
});

/* -------------------------------------------------------------------------- */
/*                               assignee stack                               */
/* -------------------------------------------------------------------------- */

/*
  Emotion re-serialises an `sx` object whenever its identity changes, so an sx
  literal written inline in JSX pays that cost on every single render — and
  during a drag these avatars re-render constantly. Both caches below key on the
  only values the styles actually depend on, so each distinct style object is
  built once for the lifetime of the page.
*/

const avatarSxCache = new Map<string, SxProps<Theme>>();

function avatarSx(member: Member): SxProps<Theme> {
  const key = `${member.from}|${member.to}`;
  let sx = avatarSxCache.get(key);
  if (!sx) {
    sx = {
      background: `linear-gradient(135deg, ${member.from}, ${member.to})`,
      color: "#fff",
      transition: "transform 200ms cubic-bezier(0.22,1,0.36,1)",
      "&:hover": { transform: "translateY(-2px) scale(1.08)", zIndex: 5 },
    };
    avatarSxCache.set(key, sx);
  }
  return sx;
}

const groupSxCache = new Map<number, SxProps<Theme>>();

function groupSx(size: number): SxProps<Theme> {
  let sx = groupSxCache.get(size);
  if (!sx) {
    sx = {
      "& .MuiAvatar-root": {
        width: size,
        height: size,
        fontSize: size * 0.38,
      },
    };
    groupSxCache.set(size, sx);
  }
  return sx;
}

const groupSlotPropsCache = new Map<number, Record<string, unknown>>();

function groupSlotProps(size: number) {
  let slotProps = groupSlotPropsCache.get(size);
  if (!slotProps) {
    slotProps = {
      additionalAvatar: {
        sx: {
          width: size,
          height: size,
          fontSize: size * 0.38,
          fontWeight: 600,
          bgcolor: "rgba(120,120,140,0.22)",
          color: "text.secondary",
        },
      },
    };
    groupSlotPropsCache.set(size, slotProps);
  }
  return slotProps;
}

/**
 * MUI's AvatarGroup handles the overlap + "+N" overflow; the gradient fill is
 * applied per-member so the stack reads as people, not grey circles.
 */
export const AssigneeStack = React.memo(function AssigneeStack({
  members,
  max = 3,
  size = 26,
}: {
  members: Member[];
  max?: number;
  size?: number;
}) {
  if (members.length === 0) return null;

  return (
    <AvatarGroup
      max={max}
      slotProps={groupSlotProps(size)}
      sx={groupSx(size)}
    >
      {members.map((m) => (
        <Tooltip key={m.id} title={m.name} placement="top">
          <Avatar sx={avatarSx(m)}>{m.initials}</Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
});

/* -------------------------------------------------------------------------- */
/*                                 small stat                                 */
/* -------------------------------------------------------------------------- */

export const MetaStat = React.memo(function MetaStat({
  icon: Icon,
  label,
  tooltip,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: React.ReactNode;
  tooltip?: string;
  className?: string;
}) {
  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {body}
    </Tooltip>
  ) : (
    body
  );
});
