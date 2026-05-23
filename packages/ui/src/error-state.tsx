import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "./lib/utils";

export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-md border border-hairline bg-canvas px-6 py-16 text-center",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-stone">
        <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <h3 className="text-lg font-medium text-primary">{title}</h3>
        {description ? (
          <p className="text-sm leading-relaxed text-body-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  ),
);
ErrorState.displayName = "ErrorState";

export { ErrorState };
