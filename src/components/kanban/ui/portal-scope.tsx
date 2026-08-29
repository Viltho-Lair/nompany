"use client";

import * as React from "react";

/**
 * THE BOARD'S DESIGN SYSTEM, CARRIED THROUGH A PORTAL.
 *
 * Every rule in kanban.css is confined to `.kanban-root` — its tokens
 * (`--popover`, `--glass-bg`, `--kb-accent`) and its utilities alike, written
 * as `.kanban-root .glass-strong { … }` so the board's palette can never leak
 * into the rest of nompany. That confinement is right, and it breaks the moment
 * a surface leaves the tree: Radix renders every dialog, select and menu into
 * `document.body`, which is not inside `.kanban-root`, so `glass-strong`
 * matches nothing and `bg-popover` resolves to nothing. The panel keeps its
 * padding, its radius and its layout and loses its BACKGROUND — the create-task
 * dialog rendered as a transparent sheet with the board legible through it, and
 * every label in it fell back to an unresolved `text-muted-foreground`.
 *
 * `display: contents` is what makes the wrapper free: it generates no box, so a
 * `position: fixed` child is still positioned against the viewport and no
 * containing block is created, while the DOM ancestry that both the descendant
 * selectors and custom-property inheritance rely on is restored. `.dark
 * .kanban-root` still matches too — `.dark` sits on <html>, above the portal.
 *
 * Wrap the portal's CONTENTS, never merge the class onto the panel itself:
 * `.kanban-root .glass-strong` needs an ancestor, and an element cannot be its
 * own.
 */
export function PortalScope({ children }: { children: React.ReactNode }) {
  return <div className="kanban-root contents">{children}</div>;
}

export default PortalScope;
