"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useShallow } from "zustand/react/shallow";
import { Plus } from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import type { Member, Task } from "@/components/kanban/lib/types";
import { useBoardStore } from "@/components/kanban/store/board-store";
import { BoardHeader } from "@/components/kanban/board/board-header";
import { BoardColumn, ColumnShell } from "@/components/kanban/board/column";
import { TaskCardShell } from "@/components/kanban/board/task-card";
import { TaskDialog } from "@/components/kanban/board/task-dialog";

/* -------------------------------------------------------------------------- */
/*                                   sensors                                  */
/* -------------------------------------------------------------------------- */

/**
 * Buttons, menus and inputs live *inside* draggable cards. These sensors bail
 * out when the gesture starts on anything marked `data-no-drag` (or on a native
 * interactive element), so a click on "⋯" opens a menu instead of lifting the
 * card.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "[data-no-drag], button, a, input, textarea, select, [role='menuitem'], [role='dialog']",
    ),
  );
}

class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent }: React.MouseEvent) =>
        !isInteractiveTarget(nativeEvent.target),
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: React.TouchEvent) =>
        !isInteractiveTarget(nativeEvent.target),
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*                             collision detection                            */
/* -------------------------------------------------------------------------- */

/**
 * Columns and cards are both sortable, so the default detectors happily snap a
 * card onto a column while the pointer is clearly over another card. This
 * restricts candidates to the type currently being dragged, and prefers cards
 * over their parent column when both intersect.
 *
 * The active type is read from the drag event rather than from React state:
 * state set in `onDragStart` is one render behind the first collision pass, and
 * a stale type sends a column drag down the card branch, where `over` resolves
 * to a task id and the reorder silently does nothing.
 */
const collisionDetection: CollisionDetection = (args) => {
  const { active, droppableContainers, ...rest } = args;

  if (active.data.current?.type === "column") {
    // closestCenter, not rectIntersection: a wide column being dragged still
    // overlaps its own slot more than its neighbour's, so intersection-based
    // detection keeps resolving to the column being dragged and nothing moves.
    return closestCenter({
      ...rest,
      active,
      droppableContainers: droppableContainers.filter(
        (c) => c.data.current?.type === "column",
      ),
    });
  }

  const pointer = pointerWithin(args);
  const collisions = pointer.length > 0 ? pointer : rectIntersection(args);

  const cardHits = collisions.filter(
    (c) =>
      droppableContainers.find((d) => d.id === c.id)?.data.current?.type ===
      "task",
  );

  return cardHits.length > 0 ? cardHits : collisions;
};

/* -------------------------------------------------------------------------- */
/*                               drop animation                               */
/* -------------------------------------------------------------------------- */

/**
 * No drop animation, by design.
 *
 * Cross-column moves are committed during `onDragOver`, so by the time the
 * pointer is released the real card is *already* sitting in its final slot
 * underneath the overlay. The overlay simply needs to disappear to reveal it —
 * animating it back onto a node that has since been unmounted and remounted in
 * another column buys nothing and is a known source of stranded overlays.
 *
 * `<DragOverlay>` is additionally keyed on the active id so the whole subtree is
 * torn down the moment a drag ends, rather than relying on an animation
 * callback that never fires if the tab is hidden or motion is reduced.
 */
const dropAnimation: DropAnimation | null = null;

/* -------------------------------------------------------------------------- */
/*                                    board                                   */
/* -------------------------------------------------------------------------- */

export function Board() {
  // Only the *order* is read here. Reading the whole `columns` map would make
  // every task move re-render the board and, with it, every column and card.
  const columnOrder = useBoardStore((s) => s.columnOrder);
  const addColumn = useBoardStore((s) => s.addColumn);
  const moveColumn = useBoardStore((s) => s.moveColumn);
  const moveTask = useBoardStore((s) => s.moveTask);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeType, setActiveType] = React.useState<"task" | "column" | null>(
    null,
  );
  /** Column currently under a dragged card — drives its glowing border. */
  const [overColumnId, setOverColumnId] = React.useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [creatingInColumn, setCreatingInColumn] = React.useState<string | null>(
    null,
  );

  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(SmartMouseSensor, {
      // Small threshold so a click still reads as a click.
      activationConstraint: { distance: 5 },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ----------------------------- drag handlers ---------------------------- */

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type as "task" | "column" | undefined;
    setActiveId(String(event.active.id));
    setActiveType(type ?? null);
    document.body.classList.add("dragging-none");
  };

  const finishDrag = () => {
    setActiveId(null);
    setActiveType(null);
    setOverColumnId(null);
    document.body.classList.remove("dragging-none");
  };

  /**
   * Cross-column moves are committed *during* the drag so the card physically
   * lands in the new list and the remaining cards part around it. Same-column
   * reordering is left to dnd-kit's sortable transform until drop.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "task") return;

    const state = useBoardStore.getState();
    const activeTaskId = String(active.id);
    const overId = String(over.id);
    if (activeTaskId === overId) return;

    const activeTask = state.tasks[activeTaskId];
    if (!activeTask) return;

    const overTask = state.tasks[overId];
    const targetColumnId = overTask
      ? overTask.columnId
      : state.columns[overId]
        ? overId
        : null;

    if (!targetColumnId) return;
    setOverColumnId((prev) => (prev === targetColumnId ? prev : targetColumnId));

    if (activeTask.columnId === targetColumnId) return;

    const targetIds = state.columns[targetColumnId]?.taskIds ?? [];
    let index = targetIds.length;

    if (overTask) {
      index = targetIds.indexOf(overTask.id);
      // Insert below the hovered card once the pointer passes its midpoint.
      const overRect = over.rect;
      const activeRect = active.rect.current.translated;
      const isBelow =
        activeRect && activeRect.top > overRect.top + overRect.height / 2;
      if (isBelow) index += 1;
      if (index < 0) index = targetIds.length;
    }

    moveTask(activeTaskId, targetColumnId, index);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      finishDrag();
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (active.data.current?.type === "column") {
      if (activeIdStr !== overIdStr) moveColumn(activeIdStr, overIdStr);
      finishDrag();
      return;
    }

    const state = useBoardStore.getState();
    const activeTask = state.tasks[activeIdStr];
    if (!activeTask) {
      finishDrag();
      return;
    }

    const overTask = state.tasks[overIdStr];

    if (overTask) {
      const targetColumnId = overTask.columnId;
      const targetIds = state.columns[targetColumnId]?.taskIds ?? [];
      const overIndex = targetIds.indexOf(overTask.id);
      if (overIndex !== -1) moveTask(activeIdStr, targetColumnId, overIndex);
    } else if (state.columns[overIdStr]) {
      moveTask(activeIdStr, overIdStr);
    }

    finishDrag();
  };

  /* ------------------------------- overlay -------------------------------- */

  const draggedTask = useBoardStore((s) => (activeId ? s.tasks[activeId] : undefined));
  const activeTask: Task | undefined =
    activeType === "task" ? draggedTask : undefined;

  const activeTaskMembers = useBoardStore(
    useShallow((s) => {
      const t = activeId ? s.tasks[activeId] : undefined;
      if (!t) return [] as Member[];
      return t.assigneeIds
        .map((id) => s.members[id])
        .filter((m): m is Member => Boolean(m));
    }),
  );

  const draggedColumn = useBoardStore((s) =>
    activeId ? s.columns[activeId] : undefined,
  );
  const activeColumn = activeType === "column" ? draggedColumn : undefined;

  const activeColumnTasks = useBoardStore(
    useShallow((s) => {
      const c = activeId ? s.columns[activeId] : undefined;
      if (!c) return [] as Task[];
      return c.taskIds.map((id) => s.tasks[id]).filter((t): t is Task => Boolean(t));
    }),
  );

  /* -------------------------------- render -------------------------------- */

  const handleAddColumn = () => {
    addColumn();
    // Let the new column mount, then reveal it.
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    });
  };

  return (
    <>
      <BoardHeader onAddColumn={handleAddColumn} />

      <DndContext
        // Without an explicit id, dnd-kit derives its `aria-describedby` ids
        // from a module-level counter that differs between SSR and hydration.
        id="kanban-board"
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={finishDrag}
      >
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-5 sm:px-6"
        >
          <SortableContext
            items={columnOrder}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full items-stretch gap-4">
              {/*
                NOMPANY SEAM: the columns were wrapped in AnimatePresence +
                motion.div for an opacity fade. motion is fenced out of the
                studio bundle, so each column mounts with a CSS fade-in and the
                add-column tile drops its `layout` prop — dnd-kit's own
                transform still animates reordering, exactly as before.
              */}
              {columnOrder.map((id) => (
                <div key={id} className="h-full animate-in fade-in duration-150">
                  <BoardColumn
                    columnId={id}
                    onEditTask={setEditingTaskId}
                    onAddTask={setCreatingInColumn}
                    isDropTarget={activeType === "task" && overColumnId === id}
                  />
                </div>
              ))}

              {/* Add-column affordance, sized to match a real column. */}
              <div className="h-full">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className={cn(
                    "group flex h-full w-[280px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl",
                    "border border-dashed border-border/70 bg-foreground/[0.015]",
                    "text-muted-foreground/80 transition-all duration-300",
                    "hover:border-primary/45 hover:bg-primary/[0.04] hover:text-foreground active:scale-[0.99]",
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-foreground/[0.05] transition-all duration-300 group-hover:bg-primary/15 group-hover:text-primary group-hover:shadow-glow-sm">
                    <Plus className="size-5" />
                  </span>
                  <span className="text-[13px] font-medium">Add column</span>
                </button>
              </div>
            </div>
          </SortableContext>
        </div>

        {/* The floating card: lifted, tilted, slightly larger. */}
        <DragOverlay key={activeId ?? "idle"} dropAnimation={dropAnimation}>
          {activeTask ? (
            <div
              style={{
                transform: "rotate(2deg) scale(1.02)",
                transformOrigin: "center",
              }}
              className="w-[286px] cursor-grabbing"
            >
              <TaskCardShell task={activeTask} members={activeTaskMembers} overlay />
            </div>
          ) : activeColumn ? (
            <div
              style={{ transform: "rotate(1.5deg) scale(1.02)" }}
              className="h-full cursor-grabbing"
            >
              <ColumnShell column={activeColumn} overlay className="h-[420px]">
                <div className="px-3.5 pb-2 pt-3.5">
                  <h3 className="truncate text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/85">
                    {activeColumn.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {activeColumnTasks.length} cards
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 px-3 opacity-70">
                  {activeColumnTasks.slice(0, 3).map((t) => (
                    <TaskCardShell key={t.id} task={t} members={[]} overlay />
                  ))}
                </div>
              </ColumnShell>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Editing an existing card */}
      <TaskDialog
        taskId={editingTaskId}
        open={Boolean(editingTaskId)}
        onOpenChange={(o) => !o && setEditingTaskId(null)}
      />

      {/* Creating a new card in a specific column */}
      <TaskDialog
        createInColumn={creatingInColumn}
        open={Boolean(creatingInColumn)}
        onOpenChange={(o) => !o && setCreatingInColumn(null)}
      />
    </>
  );
}
