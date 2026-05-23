import * as React from "react";
import { cn } from "./lib/utils";

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  bordered?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ title, description, action, bordered = false, className, children, ...props }, ref) => (
    <section
      ref={ref}
      className={cn(
        "flex flex-col gap-5",
        bordered && "rounded-md border border-border-light bg-canvas p-6",
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1">
            {title ? (
              <h2 className="text-lg font-medium leading-tight tracking-tight text-primary">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm leading-relaxed text-body-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  ),
);
Section.displayName = "Section";

export { Section };
