import * as React from "react";
import { cn } from "./lib/utils";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, action, eyebrow, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-4 border-b border-border-light pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex flex-col gap-2">
        {eyebrow ? (
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-medium leading-tight tracking-tight text-primary sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-body-muted sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  ),
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
