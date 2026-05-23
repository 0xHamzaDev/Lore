"use client";
import * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: "group toast bg-canvas text-ink border border-border-light",
        description: "text-body-muted",
        actionButton: "bg-primary text-canvas rounded-full",
        cancelButton: "bg-soft-stone text-ink rounded-full",
      },
    }}
    {...props}
  />
);

export { Toaster };
