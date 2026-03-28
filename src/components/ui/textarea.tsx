import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full border border-warm-border bg-surface px-3 py-2",
          "text-body text-ink placeholder:text-muted/50",
          "focus-visible:outline-none focus-visible:border-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none transition-colors duration-150",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
