import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./lib/utils";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-hairline bg-canvas px-6 py-16 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-stone">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
      ) : null}
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
EmptyState.displayName = "EmptyState";

export { EmptyState };
