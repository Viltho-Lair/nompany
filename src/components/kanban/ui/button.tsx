"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/components/kanban/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium",
    // The micro-interaction contract: everything presses in, nothing jumps.
    "transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-out",
    "active:scale-[0.97] active:duration-75",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glow-sm hover:brightness-110 hover:shadow-glow",
        gradient:
          "bg-gradient-to-br from-[#8b5cf6] via-indigo-500 to-sky-500 text-white shadow-glow-sm hover:shadow-glow hover:brightness-110",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 ring-1 ring-inset ring-border/60",
        outline:
          "border border-border/70 bg-transparent hover:bg-[hsl(var(--kb-accent)/0.6)] hover:text-[hsl(var(--kb-accent-foreground))] hover:border-primary/40",
        ghost:
          "hover:bg-[hsl(var(--kb-accent)/0.6)] hover:text-[hsl(var(--kb-accent-foreground))]",
        // `glass-flat`: these live on the already-blurred header, so a second
        // backdrop pass would sample an almost-uniform surface for no gain.
        glass:
          "glass-flat glass-sheen text-foreground hover:border-primary/40 hover:shadow-glow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 shadow-[0_4px_16px_-8px_hsl(var(--destructive))]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-base",
        icon: "size-9",
        "icon-sm": "size-7 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
