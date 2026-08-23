"use client";

import "@/components/kanban/kanban.css";
import { AmbientBackground } from "@/components/kanban/ambient-background";
import { Board } from "@/components/kanban/board/board";

/**
 * The board surface, wrapped in its scoped design-system root. Everything the
 * kanban draws lives under `.kanban-root` so its tokens and utilities never
 * collide with nompany's. State (columns, tasks, members) is read from the
 * zustand store; the parent profile hydrates it from Redis and persists changes
 * back — this component only renders.
 */
export function KanbanBoard() {
  return (
    <div className="kanban-root relative flex h-full min-h-0 flex-col overflow-hidden">
      <AmbientBackground />
      <Board />
    </div>
  );
}

export default KanbanBoard;
