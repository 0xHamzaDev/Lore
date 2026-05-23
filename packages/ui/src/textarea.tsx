import * as React from "react";
import { cn } from "./lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xs border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink transition-colors",
        "placeholder:text-muted",
        "focus-visible:outline-none focus-visible:border-form-focus focus-visible:ring-1 focus-visible:ring-form-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
