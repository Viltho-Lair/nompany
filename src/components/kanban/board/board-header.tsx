"use client";

import * as React from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { boardDict, boardWord } from "@/shared/studio/board";
import Tooltip from "@mui/material/Tooltip";
import { LayoutGrid, Plus, RotateCcw, Search, X } from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import { PRIORITY_META, type Member, type Priority } from "@/components/kanban/lib/types";
import { useShallow } from "zustand/react/shallow";

import { useBoardStore } from "@/components/kanban/store/board-store";
import { Button } from "@/components/kanban/ui/button";
import { Input } from "@/components/kanban/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kanban/ui/select";
import { AssigneeStack } from "@/components/kanban/board/meta-bits";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

// NOMPANY SEAM: the original header carried a next-themes ThemeToggle. Dark
// mode in nompany is driven by the studio shell (the `.dark` class + MUI
// colorSchemeSelector), so the per-board toggle is dropped — the board follows
// whatever the studio is set to.

export function BoardHeader({ onAddColumn }: { onAddColumn: () => void }) {
  const tr = boardDict(useStudioLocale());
  const boardName = useBoardStore((s) => s.boardName);
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const query = useBoardStore((s) => s.query);
  const setQuery = useBoardStore((s) => s.setQuery);
  const priorityFilter = useBoardStore((s) => s.priorityFilter);
  const setPriorityFilter = useBoardStore((s) => s.setPriorityFilter);
  const resetBoard = useBoardStore((s) => s.resetBoard);

  // Both selectors build fresh objects, so they need shallow comparison —
  // zustand v5 compares snapshots with Object.is by default.
  const stats = useBoardStore(
    useShallow((s) => {
      const all = Object.values(s.tasks);
      const subtasks = all.flatMap((t) => t.subtasks);
      return {
        columns: s.columnOrder.length,
        tasks: all.length,
        done: subtasks.filter((st) => st.done).length,
        subtasks: subtasks.length,
      };
    }),
  );

  const members = useBoardStore(
    useShallow((s) =>
      s.memberOrder
        .map((id) => s.members[id])
        .filter((m): m is Member => Boolean(m)),
    ),
  );

  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(boardName);

  return (
    <header className="shrink-0 px-4 pb-3 pt-4 sm:px-6">
      <div className="glass-strong glass-sheen rounded-2xl px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Identity */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] via-indigo-500 to-sky-500 text-white shadow-glow-sm">
              <LayoutGrid className="size-5" />
            </div>

            <div className="min-w-0">
              {editingName ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    renameBoard(draftName);
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameBoard(draftName);
                      setEditingName(false);
                    }
                    if (e.key === "Escape") {
                      setDraftName(boardName);
                      setEditingName(false);
                    }
                  }}
                  className="w-48 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[17px] font-semibold outline-none ring-1 ring-primary/40"
                />
              ) : (
                <Tooltip title={tr.doubleClickRename} placement="bottom-start">
                  <h1
                    onDoubleClick={() => {
                      setDraftName(boardName);
                      setEditingName(true);
                    }}
                    className="truncate text-[17px] font-semibold tracking-[-0.02em] text-gradient"
                  >
                    {boardName}
                  </h1>
                </Tooltip>
              )}

              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                {stats.columns} columns · {stats.tasks} cards ·{" "}
                <span className="tabular-nums">
                  {stats.done}/{stats.subtasks}
                </span>{" "}
                subtasks done
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <AssigneeStack members={members} max={5} size={28} />
          </div>

          {/* Controls */}
          <div className="ms-auto flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <div className="relative w-full max-w-56 sm:w-56">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr.searchCards}
                className="h-9 ps-[2.1rem] pe-8 text-[13px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={tr.clearSearch}
                  className="absolute end-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as Priority | "all")}
            >
              <SelectTrigger className="h-9 w-[7.5rem] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr.allPriorities}</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          PRIORITY_META[p].dot,
                        )}
                      />
                      {boardWord(tr, PRIORITY_META[p].labelKey)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip title={tr.clearBoardRemovesAll} placement="bottom">
              <span>
                <Button
                  variant="glass"
                  size="icon"
                  aria-label={tr.clearBoard}
                  onClick={() => resetBoard(tr)}
                >
                  <RotateCcw />
                </Button>
              </span>
            </Tooltip>

            <Button variant="gradient" onClick={onAddColumn} className="h-9">
              <Plus /> <span className="hidden sm:inline">{tr.column}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
