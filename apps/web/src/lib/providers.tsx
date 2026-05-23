"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "@lore/ui";

export function Providers({
  children,
  dir = "ltr",
}: {
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );

  return (
    <DirectionProvider dir={dir}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-center" dir={dir} />
      </QueryClientProvider>
    </DirectionProvider>
  );
}
