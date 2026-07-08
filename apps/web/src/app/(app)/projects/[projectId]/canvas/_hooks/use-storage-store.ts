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
 * 4. React to remote Storage changes → merge them into the local store.
 *
 * Bidirectional real-time sync: `useStorage` re-renders on every change to the
 * records map (local OR remote), so the merge effect (step 4) diffs the latest
 * snapshot into the local store as *remote* changes. The push listener (step 3)
 * only fires on `source: "user"` changes, so remote merges never echo back —
 * two clients on the same branch now see each other's shapes live.
 */

import { useEffect, useRef, useState } from "react";
import { createTLStore, defaultBindingUtils, defaultShapeUtils } from "tldraw";
import type {
  TLAnyBindingUtilConstructor,
  TLAnyShapeUtilConstructor,
  TLRecord,
  TLStore,
} from "tldraw";
import { useStorage, useMutation } from "@/lib/liveblocks.config";
import { EntityShapeUtil } from "../_components/entity-shape-util";

export type LoadingState = "loading" | "ready" | "error";

interface UseStorageStoreResult {
  store: TLStore;
  loadingState: LoadingState;
}

export function useStorageStore(): UseStorageStoreResult {
  // Create the tldraw store with the default shape/binding utils PLUS our EntityShapeUtil.
  // The default arrow binding's migrations depend on the default arrow shape's migrations —
  // omitting the defaults makes createTLSchema throw "depends on missing migration".
  // The casts work around tldraw's stricter constructor generics under exactOptionalPropertyTypes.
  const [store] = useState<TLStore>(() =>
    createTLStore({
      shapeUtils: [
        ...(defaultShapeUtils as readonly TLAnyShapeUtilConstructor[]),
        EntityShapeUtil,
      ],
      bindingUtils: [
        ...(defaultBindingUtils as readonly TLAnyBindingUtilConstructor[]),
      ],
    }),
  );

  const [loadingState, setLoadingState] = useState<LoadingState>("loading");

  // Read the current snapshot of Liveblocks records from storage.
  // `records` is a LiveMap<string, Json> — each value is a serialized TLRecord.
  const liveblocksRecords = useStorage((root) => root.records);

  // Mutation that writes a single record into the Liveblocks LiveMap.
  const putRecord = useMutation(({ storage }, record: TLRecord) => {
    storage
      .get("records")
      .set(
        record.id,
        record as unknown as Parameters<
          ReturnType<typeof storage.get>["set"]
        >[1],
      );
  }, []);

  // Mutation that deletes a record from the Liveblocks LiveMap.
  const deleteRecord = useMutation(({ storage }, id: string) => {
    storage.get("records").delete(id);
  }, []);

  // Track whether we have seeded the store from Liveblocks.
  const seededRef = useRef(false);

  // Ids currently present in the remote records map. Used by the merge effect to
  // detect remote deletions (an id that was here last tick but is now gone).
  const remoteIdsRef = useRef<Set<string>>(new Set());

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
      // Per-record put: a single malformed legacy record must not crash the
      // entire seed. The migration sequence on EntityShapeUtil handles the
      // common cases; this is defense for everything else.
      store.mergeRemoteChanges(() => {
        for (const record of existing) {
          try {
            store.put([record], "initialize");
          } catch (err) {
            console.warn(
              "[useStorageStore] skipping malformed record on seed",
              {
                recordId: (record as { id?: string }).id,
                recordType: (record as { typeName?: string }).typeName,
                error: err instanceof Error ? err.message : err,
              },
            );
          }
        }
      });
    }

    setLoadingState("ready");
  }, [liveblocksRecords, store]);

  // ── Connection timeout guard ───────────────────────────────────────────────
  // useStorage blocks until the Liveblocks room connects. If auth fails, the
  // public key is wrong, or the network is down, `liveblocksRecords` never
  // arrives and the canvas would spin forever. After a grace period, surface an
  // error the UI can recover from (reload) instead of an infinite spinner.
  useEffect(() => {
    if (loadingState !== "loading") return;
    const timer = setTimeout(() => {
      setLoadingState((s) => (s === "loading" ? "error" : s));
    }, 15000);
    return () => clearTimeout(timer);
  }, [loadingState]);
  // ── Step 1b: Merge remote Storage changes into the local store ─────────────
  //
  // `liveblocksRecords` is a fresh snapshot on every change to the records map,
  // including edits made by OTHER clients. We diff it against the local store
  // and apply the delta inside `mergeRemoteChanges` so the change is tagged
  // `source: "remote"` — the push listener below (source: "user") therefore
  // ignores it and we never echo a remote change back to Liveblocks.
  useEffect(() => {
    if (loadingState !== "ready") return;
    if (!liveblocksRecords) return;

    const nextRemoteIds = new Set<string>();
    const toPut: TLRecord[] = [];

    for (const value of Object.values(liveblocksRecords)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as unknown as TLRecord;
      if (!record.id) continue;
      nextRemoteIds.add(record.id);

      // Only apply records that differ from what we already have, so a record we
      // just pushed ourselves (round-tripped through Storage) is a no-op rather
      // than a redundant write.
      const local = store.get(record.id);
      if (!local || JSON.stringify(local) !== JSON.stringify(record)) {
        toPut.push(record);
      }
    }

    // An id that was remote-managed last tick but is absent now is a remote
    // deletion. We only remove ids we previously saw in Storage, so local-only
    // records (camera, instance state, …) that never sync are never touched.
    const toDelete: string[] = [];
    for (const id of remoteIdsRef.current) {
      if (!nextRemoteIds.has(id) && store.has(id as TLRecord["id"])) {
        toDelete.push(id);
      }
    }
    remoteIdsRef.current = nextRemoteIds;

    if (toPut.length === 0 && toDelete.length === 0) return;

    store.mergeRemoteChanges(() => {
      for (const record of toPut) {
        try {
          store.put([record], "initialize");
        } catch (err) {
          console.warn("[useStorageStore] skipping malformed remote record", {
            recordId: record.id,
            error: err instanceof Error ? err.message : err,
          });
        }
      }
      if (toDelete.length > 0) {
        store.remove(toDelete as unknown as TLRecord["id"][]);
      }
    });
  }, [liveblocksRecords, loadingState, store]);

  // ── Step 2: Subscribe to local store changes → push to Liveblocks ──────────
  //
  // Architectural invariant — Liveblocks/Postgres split (see .specs/lore-mvp/phases.md):
  //   • Liveblocks Storage = source of truth for shape geometry (x, y, rotation, w/h)
  //     and any other tldraw-managed record fields.
  //   • Postgres entity tables = source of truth for entity *content* (name, traits,
  //     relations, etc.) and are only written via Server Actions in `_actions.ts`.
  //
  // This listener forwards every "user"-sourced TLRecord change straight to the
  // Liveblocks LiveMap. It must NEVER call a Postgres-touching Server Action,
  // otherwise bulk multi-select moves would explode into N entity-table UPDATE
  // statements per drag frame. Position-only updates stay in Liveblocks by
  // design — verified by story #19 (Phase 3.5).
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
