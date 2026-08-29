"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/components/kanban/lib/utils";
import { PortalScope } from "@/components/kanban/ui/portal-scope";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// OPAQUE, unlike the rest of the board. `glass-strong` is 0.88 white over
// whatever is behind it, which is right for a dialog the size of a sheet and
// wrong for a 200px menu: it opens ON TOP of the cards it filters, so the text
// people are trying to read sits over card titles and priority dots showing
// through. `bg-popover` is the token that exists for exactly this — opaque
// white, opaque navy in dark — and the sheen stays so the menu still belongs to
// the same family of surfaces.
const menuSurface = [
  "z-50 min-w-[10rem] overflow-hidden rounded-xl p-1.5",
  "bg-popover text-popover-foreground border border-border/70 glass-sheen shadow-lift",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
  "data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
].join(" ");

const menuItem = [
  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2",
  "text-sm outline-none transition-colors duration-150",
  "focus:bg-[hsl(var(--kb-accent)/0.7)] focus:text-[hsl(var(--kb-accent-foreground))]",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
  "focus:[&_svg]:text-current",
].join(" ");

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(menuItem, "data-[state=open]:bg-[hsl(var(--kb-accent)/0.7)]", className)}
    {...props}
  >
    {children}
    <ChevronRight className="ms-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(menuSurface, className)}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <PortalScope>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(menuSurface, className)}
        {...props}
      />
    </PortalScope>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    destructive?: boolean;
  }
>(({ className, inset, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      menuItem,
      inset && "ps-8",
      destructive &&
        "text-destructive focus:bg-destructive/12 focus:text-destructive [&_svg]:text-destructive",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(menuItem, "pe-8", className)}
    {...props}
  >
    {children}
    <span className="absolute end-2 flex size-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="size-4 text-primary" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(menuItem, "pe-8", className)}
    {...props}
  >
    {children}
    <span className="absolute end-2 flex size-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-primary text-primary" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
      inset && "ps-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border/70", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ms-auto text-[10px] font-medium tracking-widest text-muted-foreground",
      className,
    )}
    {...props}
  />
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
