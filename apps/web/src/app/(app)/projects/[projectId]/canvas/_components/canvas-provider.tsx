"use client";

import { type ReactNode } from "react";
import { LiveMap } from "@liveblocks/client";
import { Skeleton } from "@lore/ui";
import { RoomProvider, ClientSideSuspense } from "@/lib/liveblocks.config";

interface CanvasProviderProps {
  roomId: string;
  children: ReactNode;
}

export function CanvasProvider({ roomId, children }: CanvasProviderProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null }}
      initialStorage={() => ({ records: new LiveMap() })}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-[#fafaf9]">
            <Skeleton className="h-[60vh] w-[80vw] rounded-sm" />
          </div>
        }
      >
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
