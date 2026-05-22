import { createClient } from "@liveblocks/client";
import type { Json, LiveMap } from "@liveblocks/client";
import { createRoomContext, ClientSideSuspense } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

type Storage = {
  records: LiveMap<string, Json>;
};

const {
  suspense: { RoomProvider, useRoom, useStorage, useMutation, useOthersMapped, useSelf },
} = createRoomContext<Presence, Storage>(client);

export {
  RoomProvider,
  useRoom,
  useStorage,
  useMutation,
  useOthersMapped,
  useSelf,
  ClientSideSuspense,
};
