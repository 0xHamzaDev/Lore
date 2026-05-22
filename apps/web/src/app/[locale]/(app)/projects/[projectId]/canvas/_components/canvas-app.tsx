"use client";

import "tldraw/tldraw.css";

import { createId } from "@paralleldrive/cuid2";
import type { EntityType } from "@lore/db";
import { Clock, Film, MapPin, Shield, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw } from "tldraw";
import type { Editor, TLShapeId } from "tldraw";
import { toast } from "sonner";

import { useStorageStore } from "../_hooks/use-storage-store";
import { createEntity, listEntities } from "../_actions";
import { ENTITY_SHAPE_TYPE, EntityShapeUtil } from "./entity-shape-util";
import type { EntityShape } from "./entity-shape-util";

// TODO Task 9: import { EntityPanel } from "./entity-panel"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvasAppProps {
  projectId: string;
  branchId: string;
  orgId: string;
  userId: string;
  userName: string;
}

// ─── Entity toolbar config ────────────────────────────────────────────────────

const ENTITY_TOOLBAR: {
  type: EntityType;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { type: "character", label: "Character", Icon: User },
  { type: "location", label: "Location", Icon: MapPin },
  { type: "faction", label: "Faction", Icon: Shield },
  { type: "scene", label: "Scene", Icon: Film },
  { type: "timeline_event", label: "Event", Icon: Clock },
];

const DEFAULT_NAMES: Record<EntityType, string> = {
  character: "New Character",
  location: "New Location",
  faction: "New Faction",
  scene: "New Scene",
  timeline_event: "New Event",
};

// ─── Helper to derive displayName from an AnyEntity-like record ───────────────

function getEntityDisplayName(entity: Record<string, unknown>, type: EntityType): string {
  if (type === "scene" || type === "timeline_event") {
    return typeof entity.title === "string" ? entity.title : "Untitled";
  }
  return typeof entity.name === "string" ? entity.name : "Untitled";
}

// ─── CanvasApp ────────────────────────────────────────────────────────────────

export function CanvasApp({ projectId, branchId, orgId }: CanvasAppProps) {
  const { store, loadingState } = useStorageStore();
  const editorRef = useRef<Editor | null>(null);

  // Track selected entity shape
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);

  // ── Editor mount ─────────────────────────────────────────────────────────────

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Listen to store changes to track selection
      const unsub = store.listen(() => {
        const selectedShapes = editor.getSelectedShapes();
        const entityShape = selectedShapes.find(
          (s): s is EntityShape => s.type === ENTITY_SHAPE_TYPE,
        );
        if (entityShape) {
          setSelectedEntityId(entityShape.props.entityId || null);
          setSelectedEntityType(entityShape.props.entityType);
        } else {
          setSelectedEntityId(null);
          setSelectedEntityType(null);
        }
      });

      return unsub;
    },
    [store],
  );

  // ── Canvas shape sync on mount ───────────────────────────────────────────────

  useEffect(() => {
    if (loadingState !== "ready") return;
    const editor = editorRef.current;
    if (!editor) return;

    const entityTypes: EntityType[] = [
      "character",
      "location",
      "faction",
      "scene",
      "timeline_event",
    ];

    void (async () => {
      for (const type of entityTypes) {
        const result = await listEntities(type, branchId, orgId);
        if (!result.success) continue;

        // Find entity IDs already represented as shapes
        const existingShapes = editor
          .getCurrentPageShapes()
          .filter((s): s is EntityShape => s.type === ENTITY_SHAPE_TYPE);

        const existingEntityIds = new Set(existingShapes.map((s) => s.props.entityId));

        for (const entity of result.data) {
          if (existingEntityIds.has(entity.id)) continue;

          // Random position within a 1200×800 viewport
          const x = Math.random() * 1200;
          const y = Math.random() * 800;

          const shapeId = `shape:${createId()}` as TLShapeId;
          const displayName = getEntityDisplayName(
            entity as unknown as Record<string, unknown>,
            type,
          );

          editor.createShapes<EntityShape>([
            {
              id: shapeId,
              type: ENTITY_SHAPE_TYPE,
              x,
              y,
              props: {
                entityId: entity.id,
                entityType: type,
                displayName,
                w: 200,
                h: 120,
              },
            },
          ]);
        }
      }
    })();
  }, [loadingState, branchId, orgId]);

  // ── Create entity ─────────────────────────────────────────────────────────────

  const handleCreateEntity = useCallback(
    async (type: EntityType) => {
      const editor = editorRef.current;
      if (!editor) return;

      const provisionalId = createId();
      const defaultName = DEFAULT_NAMES[type];

      // Get a position near center of current viewport
      const viewportBounds = editor.getViewportPageBounds();
      const x = viewportBounds.minX + viewportBounds.width / 2 - 100;
      const y = viewportBounds.minY + viewportBounds.height / 2 - 60;

      const shapeId = `shape:${createId()}` as TLShapeId;

      // Optimistically create the shape
      editor.createShapes<EntityShape>([
        {
          id: shapeId,
          type: ENTITY_SHAPE_TYPE,
          x,
          y,
          props: {
            entityId: provisionalId,
            entityType: type,
            displayName: defaultName,
            w: 200,
            h: 120,
          },
        },
      ]);

      // Fire the server action
      const result = await createEntity({
        type,
        orgId,
        projectId,
        branchId,
        name: defaultName,
      });

      if (!result.success) {
        // Rollback: delete the optimistic shape
        editor.deleteShapes([shapeId]);
        toast.error(result.error ?? "Failed to create entity.");
        return;
      }

      // Update shape with real entityId and displayName from server
      const entity = result.data;
      const displayName = getEntityDisplayName(entity as unknown as Record<string, unknown>, type);

      editor.updateShapes<EntityShape>([
        {
          id: shapeId,
          type: ENTITY_SHAPE_TYPE,
          props: {
            entityId: entity.id,
            displayName,
          },
        },
      ]);
    },
    [orgId, projectId, branchId],
  );

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loadingState === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#003c33] border-t-transparent" />
      </div>
    );
  }

  if (loadingState === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-red-500">Failed to load canvas. Please refresh.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full">
      {/* Entity type toolbar — RTL-safe: positioned at inline-start */}
      <div
        className="absolute top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 rounded-lg border border-[#d9d9dd] bg-white p-2 shadow-sm"
        style={{ insetInlineStart: "1rem" }}
      >
        {ENTITY_TOOLBAR.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            title={label}
            onClick={() => void handleCreateEntity(type)}
            className="flex flex-col items-center gap-1 rounded-md p-2 text-[#17171c] transition-colors hover:bg-[#f5f5f7] active:bg-[#eaeaec]"
          >
            <Icon size={18} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* tldraw canvas */}
      <Tldraw store={store} shapeUtils={[EntityShapeUtil]} onMount={handleMount} />

      {/* Entity panel placeholder — Task 9 */}
      {selectedEntityId && selectedEntityType && (
        // TODO Task 9: <EntityPanel ... />
        <div className="absolute inset-y-0 end-0 w-80 border-s border-[#d9d9dd] bg-white" />
      )}
    </div>
  );
}
