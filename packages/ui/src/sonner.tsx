"use client";
import * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: "group toast bg-white text-[#212121] border border-[#e5e7eb] shadow-sm",
        description: "text-[#93939f]",
        actionButton: "bg-[#17171c] text-white",
        cancelButton: "bg-[#eeece7] text-[#212121]",
      },
    }}
    {...props}
  />
);

export { Toaster };
