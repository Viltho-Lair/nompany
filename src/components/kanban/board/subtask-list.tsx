"use client";

import * as React from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { boardDict } from "@/shared/studio/board";
import Tooltip from "@mui/material/Tooltip";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import type { Subtask } from "@/components/kanban/lib/types";
import { useBoardStore } from "@/components/kanban/store/board-store";
import { Checkbox } from "@/components/kanban/ui/checkbox";
import { Input } from "@/components/kanban/ui/input";
import { Button } from "@/components/kanban/ui/button";

/* -------------------------------------------------------------------------- */

function SubtaskRow({
  taskId,
  subtask,
  index,
  count,
}: {
  taskId: string;
  subtask: Subtask;
  index: number;
  count: number;
}) {
  const tr = boardDict(useStudioLocale());
  const toggleSubtask = useBoardStore((s) => s.toggleSubtask);
  const renameSubtask = useBoardStore((s) => s.renameSubtask);
  const deleteSubtask = useBoardStore((s) => s.deleteSubtask);
  const reorderSubtasks = useBoardStore((s) => s.reorderSubtasks);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(subtask.title);

  const commit = () => {
    renameSubtask(taskId, subtask.id, draft);
    setEditing(false);
  };

  // NOMPANY SEAM: framer-motion's layout+height spring is dropped (motion is
  // fenced out of the studio bundle). A row appears with a short CSS fade;
  // removal is instant. Nothing the user is watching depends on the exit.
  return (
    <li className="group/sub overflow-hidden animate-in fade-in duration-150">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
          "transition-colors duration-150 hover:bg-foreground/[0.04]",
        )}
      >
        <Checkbox
          checked={subtask.done}
          onCheckedChange={() => toggleSubtask(taskId, subtask.id)}
          aria-label={subtask.title}
        />

        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(subtask.title);
                setEditing(false);
              }
            }}
            className="h-7 flex-1 text-[13px]"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => {
              setDraft(subtask.title);
              setEditing(true);
            }}
            onClick={() => toggleSubtask(taskId, subtask.id)}
            className={cn(
              "flex-1 truncate text-start text-[13px] transition-all duration-200",
              subtask.done
                ? "text-muted-foreground/70 line-through decoration-muted-foreground/40"
                : "text-foreground/90",
            )}
          >
            {subtask.title}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/sub:opacity-100">
          <Tooltip title={tr.moveUp} placement="top">
            <span>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => reorderSubtasks(taskId, index, index - 1)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-all hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowUp className="size-3" />
              </button>
            </span>
          </Tooltip>
          <Tooltip title={tr.moveDown} placement="top">
            <span>
              <button
                type="button"
                disabled={index === count - 1}
                onClick={() => reorderSubtasks(taskId, index, index + 1)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-all hover:bg-[hsl(var(--kb-accent)/0.7)] hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowDown className="size-3" />
              </button>
            </span>
          </Tooltip>
          <Tooltip title={tr.deleteSubtask} placement="top">
            <button
              type="button"
              onClick={() => deleteSubtask(taskId, subtask.id)}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive active:scale-90"
            >
              <Trash2 className="size-3" />
            </button>
          </Tooltip>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

export function SubtaskList({
  taskId,
  subtasks,
}: {
  taskId: string;
  subtasks: Subtask[];
}) {
  const tr = boardDict(useStudioLocale());
  const addSubtask = useBoardStore((s) => s.addSubtask);
  const [draft, setDraft] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addSubtask(taskId, draft);
    setDraft(""); // Stay focused so a checklist can be typed in one go.
  };

  return (
    <div>
      <ul className="-mx-2">
        {subtasks.map((st, i) => (
          <SubtaskRow
            key={st.id}
            taskId={taskId}
            subtask={st}
            index={i}
            count={subtasks.length}
          />
        ))}
      </ul>

      {subtasks.length === 0 && (
        <p className="px-0.5 py-2 text-[12px] text-muted-foreground/70">
          No subtasks yet — break this down into steps below.
        </p>
      )}

      <form onSubmit={submit} className="mt-2 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tr.addSubtaskPressEnter}
          className="h-9 text-[13px]"
        />
        <Button
          type="submit"
          size="icon"
          variant="secondary"
          disabled={!draft.trim()}
          aria-label={tr.addSubtask}
          className="size-9 shrink-0"
        >
          <Plus />
        </Button>
      </form>
    </div>
  );
}
