"use client";

/**
 * use-storage-store.ts
 *
 * Synchronizes a tldraw TLStore with Liveblocks Storage.
 *
 * Strategy:
 * 1. Create a local tldraw store with EntityShapeUtil registered.
 * 2. On mount, seed the store with any records already in Liveblocks Storage.
 * 3. Subscribe to local store changes → push additions/updates/deletions to Liveblocks.
 * 4. Subscribe to Liveblocks remote changes → merge them into the local store.
 *
 * NOTE: Full bidirectional real-time sync via Liveblocks subscribe() is a
 * future enhancement. The current implementation provides single-user
 * persistence via Liveblocks Storage: the store is seeded on mount from
 * `root.records` and local changes are pushed back to the LiveMap.
 */

import { useEffect, useRef, useState } from "react";
import { createTLStore } from "tldraw";
import type { TLStore, TLRecord } from "tldraw";
import { useStorage, useMutation } from "@/lib/liveblocks.config";
import { EntityShapeUtil } from "../_components/entity-shape-util";

export type LoadingState = "loading" | "ready" | "error";

interface UseStorageStoreResult {
  store: TLStore;
  loadingState: LoadingState;
}

export function useStorageStore(): UseStorageStoreResult {
  // Create the tldraw store once, with EntityShapeUtil registered.
  const [store] = useState<TLStore>(() => createTLStore({ shapeUtils: [EntityShapeUtil] }));

  const [loadingState, setLoadingState] = useState<LoadingState>("loading");

  // Read the current snapshot of Liveblocks records from storage.
  // `records` is a LiveMap<string, Json> — each value is a serialized TLRecord.
  const liveblocksRecords = useStorage((root) => root.records);

  // Mutation that writes a single record into the Liveblocks LiveMap.
  const putRecord = useMutation(({ storage }, record: TLRecord) => {
    storage
      .get("records")
      .set(record.id, record as unknown as Parameters<ReturnType<typeof storage.get>["set"]>[1]);
  }, []);

  // Mutation that deletes a record from the Liveblocks LiveMap.
  const deleteRecord = useMutation(({ storage }, id: string) => {
    storage.get("records").delete(id);
  }, []);

  // Track whether we have seeded the store from Liveblocks.
  const seededRef = useRef(false);

  // ── Step 1: Seed local store from Liveblocks on first ready ────────────────
  useEffect(() => {
    if (seededRef.current) return;
    if (!liveblocksRecords) return; // still loading

    seededRef.current = true;

    // useStorage returns a ToJson snapshot — a plain ReadonlyJsonObject,
    // not a LiveMap. Iterate with Object.values().
    const existing: TLRecord[] = [];
    for (const value of Object.values(liveblocksRecords)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        existing.push(value as unknown as TLRecord);
      }
    }

    if (existing.length > 0) {
      store.mergeRemoteChanges(() => {
        store.put(existing, "initialize");
      });
    }

    setLoadingState("ready");
  }, [liveblocksRecords, store]);

  // ── Step 2: Subscribe to local store changes → push to Liveblocks ──────────
  useEffect(() => {
    if (loadingState !== "ready") return;

    const unsubscribe = store.listen(
      (entry) => {
        const { added, updated, removed } = entry.changes;

        // Push new / updated records to Liveblocks.
        for (const record of Object.values(added)) {
          putRecord(record as TLRecord);
        }
        for (const [, to] of Object.values(updated) as [TLRecord, TLRecord][]) {
          putRecord(to);
        }

        // Remove deleted records from Liveblocks.
        for (const record of Object.values(removed)) {
          deleteRecord((record as TLRecord).id);
        }
      },
      // Only sync "user" source changes (not the remote merges we apply ourselves)
      { source: "user" },
    );

    return unsubscribe;
  }, [loadingState, store, putRecord, deleteRecord]);

  return { store, loadingState };
}
