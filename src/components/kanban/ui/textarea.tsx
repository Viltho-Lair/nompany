"use client";

import * as React from "react";
import { cn } from "@/components/kanban/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full resize-none rounded-lg border border-input/80 bg-background/40 px-3 py-2 text-sm",
      "transition-all duration-200",
      "placeholder:text-muted-foreground/70",
      "hover:border-primary/30",
      "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/12",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
