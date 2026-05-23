import * as React from "react";
import { cn } from "./lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, ...props }, ref) => (
    <input
      type={type}
      value={value ?? ""}
      className={cn(
        "flex h-11 w-full rounded-xs border border-hairline bg-canvas px-3.5 py-2 text-sm text-ink transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
Input.displayName = "Input";

export { Input };
