import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-body font-body transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink",
  {
    variants: {
      variant: {
        default: "bg-ink text-parchment hover:bg-dark-surface",
        rust: "bg-rust text-parchment hover:bg-rust/90",
        "rust-outline": "border border-rust text-rust bg-transparent hover:bg-rust hover:text-parchment",
        gold: "bg-gold text-parchment hover:bg-gold/90",
        "gold-outline": "border border-gold text-gold bg-transparent hover:bg-gold hover:text-parchment",
        ghost: "text-muted bg-transparent hover:text-ink hover:bg-warm-border/30",
        dim: "text-muted/50 bg-transparent hover:text-muted text-small",
      },
      size: {
        sm: "px-3 py-1.5 text-small",
        default: "px-4 py-2.5",
        lg: "px-6 py-3 text-[14px]",
        full: "w-full px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
