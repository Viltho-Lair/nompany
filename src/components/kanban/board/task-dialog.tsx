"use client";

import * as React from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import { Check, Trash2 } from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import { PRIORITY_META, type Member, type Priority } from "@/components/kanban/lib/types";
import { subtaskProgress, useBoardStore } from "@/components/kanban/store/board-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/kanban/ui/dialog";
import { Button } from "@/components/kanban/ui/button";
import { Input } from "@/components/kanban/ui/input";
import { Label } from "@/components/kanban/ui/label";
import { Textarea } from "@/components/kanban/ui/textarea";
import { SubtaskList } from "@/components/kanban/board/subtask-list";
import { ProgressBar } from "@/components/kanban/board/progress-ring";
import { PriorityBadge } from "@/components/kanban/board/meta-bits";

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

const TAG_SUGGESTIONS = [
  "design",
  "engineering",
  "research",
  "a11y",
  "growth",
  "marketing",
  "core",
  "design-system",
  "bug",
  "chore",
];

/* -------------------------------------------------------------------------- */
/*                              priority selector                             */
/* -------------------------------------------------------------------------- */

function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRIORITIES.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 transition-all duration-200 active:scale-95",
              "ring-1 ring-inset",
              active
                ? "bg-foreground/[0.06] ring-primary/50 shadow-glow-sm"
                : "ring-border/50 hover:bg-foreground/[0.04] hover:ring-border",
            )}
          >
            <PriorityBadge priority={p} className="bg-transparent ring-0" />
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              assignee selector                             */
/* -------------------------------------------------------------------------- */

function AssigneePicker({
  members,
  selected,
  onToggle,
}: {
  members: Member[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const active = selected.includes(m.id);
        return (
          <Tooltip key={m.id} title={m.name} placement="top">
            <button
              type="button"
              onClick={() => onToggle(m.id)}
              aria-pressed={active}
              className={cn(
                "relative rounded-full transition-all duration-200 active:scale-90",
                active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-55 grayscale hover:opacity-100 hover:grayscale-0",
              )}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: `linear-gradient(135deg, ${m.from}, ${m.to})`,
                }}
              >
                {m.initials}
              </Avatar>
              {active && (
                <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   dialog                                   */
/* -------------------------------------------------------------------------- */

interface TaskDialogProps {
  /** Editing an existing task. */
  taskId?: string | null;
  /** Creating a new task in this column. */
  createInColumn?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({
  taskId,
  createInColumn,
  open,
  onOpenChange,
}: TaskDialogProps) {
  const task = useBoardStore((s) => (taskId ? s.tasks[taskId] : undefined));
  const memberOrder = useBoardStore((s) => s.memberOrder);
  const membersMap = useBoardStore((s) => s.members);
  const columnTitle = useBoardStore((s) => {
    const colId = task?.columnId ?? createInColumn;
    return colId ? s.columns[colId]?.title : undefined;
  });

  const addTask = useBoardStore((s) => s.addTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const toggleAssignee = useBoardStore((s) => s.toggleAssignee);

  const isCreate = !task;

  /* ------------------------- local draft (create) ------------------------- */

  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftDesc, setDraftDesc] = React.useState("");
  const [draftPriority, setDraftPriority] = React.useState<Priority>("medium");
  const [draftTags, setDraftTags] = React.useState<string[]>([]);
  const [draftAssignees, setDraftAssignees] = React.useState<string[]>([]);

  // Reset the create-draft each time the dialog opens fresh.
  React.useEffect(() => {
    if (open && isCreate) {
      setDraftTitle("");
      setDraftDesc("");
      setDraftPriority("medium");
      setDraftTags([]);
      setDraftAssignees([]);
    }
  }, [open, isCreate]);

  const members = memberOrder
    .map((id) => membersMap[id])
    .filter((m): m is Member => Boolean(m));

  /* --------------------------- unified accessors -------------------------- */
  // Existing tasks write straight through to the store (live editing); a new
  // task edits local state until "Create task" is pressed.

  const title = isCreate ? draftTitle : task.title;
  const description = isCreate ? draftDesc : task.description;
  const priority = isCreate ? draftPriority : task.priority;
  const tags = isCreate ? draftTags : task.tags;
  const assignees = isCreate ? draftAssignees : task.assigneeIds;

  const setTitle = (v: string) =>
    isCreate ? setDraftTitle(v) : updateTask(task.id, { title: v });
  const setDescription = (v: string) =>
    isCreate ? setDraftDesc(v) : updateTask(task.id, { description: v });
  const setPriority = (v: Priority) =>
    isCreate ? setDraftPriority(v) : updateTask(task.id, { priority: v });
  const setTags = (v: string[]) =>
    isCreate ? setDraftTags(v) : updateTask(task.id, { tags: v });
  const toggleMember = (id: string) =>
    isCreate
      ? setDraftAssignees((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )
      : toggleAssignee(task.id, id);

  const progress = task ? subtaskProgress(task) : { done: 0, total: 0 };

  const handleCreate = () => {
    if (!createInColumn || !draftTitle.trim()) return;
    addTask(createInColumn, {
      title: draftTitle,
      description: draftDesc,
      priority: draftPriority,
      tags: draftTags,
      assigneeIds: draftAssignees,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={priority} />
            {columnTitle && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                in {columnTitle}
              </span>
            )}
          </div>
          <DialogTitle className="sr-only">
            {isCreate ? "Create task" : "Edit task"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isCreate
              ? "Fill in the details for a new task."
              : "Changes are saved as you type."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Title — doubles as the dialog's visual heading. */}
          <input
            value={title}
            autoFocus={isCreate}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className={cn(
              "w-full bg-transparent text-xl font-semibold tracking-[-0.015em] outline-none",
              "placeholder:text-muted-foreground/50",
              "border-b border-transparent pb-1 transition-colors duration-200",
              "focus:border-primary/40",
            )}
          />

          {/* Progress summary */}
          {progress.total > 0 && (
            <div className="flex items-center gap-3">
              <ProgressBar done={progress.done} total={progress.total} />
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to happen, and how will we know it's done?"
              className="min-h-[88px]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>

            <div className="space-y-2">
              <Label>Assignees</Label>
              <AssigneePicker
                members={members}
                selected={assignees}
                onToggle={toggleMember}
              />
            </div>
          </div>

          {/* MUI Autocomplete: free-solo chip input, themed to match Shadcn. */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={TAG_SUGGESTIONS}
              value={tags}
              onChange={(_, v) =>
                setTags(
                  Array.from(
                    new Set(
                      (v as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean),
                    ),
                  ),
                )
              }
              // MUI 9 renamed `renderTags` → `renderValue` (same shape: map the
              // selected values, spreading per-item props from getItemProps).
              renderValue={(value, getItemProps) =>
                (value as string[]).map((option, index) => {
                  const { key, ...chipProps } = getItemProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={`#${option}`}
                      size="small"
                      {...chipProps}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={tags.length ? "" : "Add tags…"}
                />
              )}
            />
          </div>

          {/* Subtasks are only editable once the task exists. */}
          {!isCreate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subtasks</Label>
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {progress.done} of {progress.total} done
                </span>
              </div>
              <SubtaskList taskId={task.id} subtasks={task.subtasks} />
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 items-center sm:justify-between">
          {!isCreate ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/12 hover:text-destructive sm:mr-auto"
              onClick={() => {
                deleteTask(task.id);
                onOpenChange(false);
              }}
            >
              <Trash2 /> Delete task
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {isCreate ? "Cancel" : "Done"}
            </Button>
            {isCreate && (
              <Button
                variant="gradient"
                disabled={!draftTitle.trim()}
                onClick={handleCreate}
              >
                Create task
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PRIORITY_META };
