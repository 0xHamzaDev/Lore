import * as React from "react";
import { cn } from "./lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-sm border border-[#d9d9dd] bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-[#93939f] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#9b60aa] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
