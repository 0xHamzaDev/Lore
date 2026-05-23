"use client";

import "tldraw/tldraw.css";

import { createId } from "@paralleldrive/cuid2";
import type { EntityType } from "@lore/db";
import { Clock, Film, MapPin, Shield, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Tldraw } from "tldraw";
import type { Editor, TLShapeId } from "tldraw";
import { toast } from "sonner";

import { useStorageStore } from "../_hooks/use-storage-store";
import { createEntity, listEntities } from "../_actions";
import { ENTITY_SHAPE_TYPE, EntityShapeUtil } from "./entity-shape-util";
import type { EntityShape } from "./entity-shape-util";
import { useMutation } from "@/lib/liveblocks.config";

import { EntityPanel } from "./entity-panel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvasAppProps {
  projectId: string;
  branchId: string;
  orgId: string;
  userId: string;
  userName: string;
}

// ─── Entity toolbar config ────────────────────────────────────────────────────

const ENTITY_TYPE_KEYS = [
  { type: "character" as EntityType, tKey: "entityTypes.character", Icon: User },
  { type: "location" as EntityType, tKey: "entityTypes.location", Icon: MapPin },
  { type: "faction" as EntityType, tKey: "entityTypes.faction", Icon: Shield },
  { type: "scene" as EntityType, tKey: "entityTypes.scene", Icon: Film },
  { type: "timeline_event" as EntityType, tKey: "entityTypes.timelineEvent", Icon: Clock },
] as const;

// ─── Helper to derive displayName from an AnyEntity-like record ───────────────

function getEntityDisplayName(entity: Record<string, unknown>, type: EntityType): string {
  if (type === "scene" || type === "timeline_event") {
    return typeof entity.title === "string" ? entity.title : "Untitled";
  }
  return typeof entity.name === "string" ? entity.name : "Untitled";
}

// ─── CanvasApp ────────────────────────────────────────────────────────────────

export function CanvasApp(props: CanvasAppProps) {
  const { projectId, branchId, orgId } = props;
  // TODO Task 9: pass props.userId and props.userName to EntityPanel for Liveblocks presence

  const t = useTranslations("Canvas");
  const tCommon = useTranslations("Common");

  const { store, loadingState } = useStorageStore();
  const editorRef = useRef<Editor | null>(null);
  const isDev = process.env.NODE_ENV !== "production";

  // Dev-only: clear the Liveblocks LiveMap so a corrupted room can be recovered.
  const clearRoomRecords = useMutation(({ storage }) => {
    const records = storage.get("records");
    for (const key of Array.from(records.keys())) {
      records.delete(key);
    }
  }, []);

  const handleResetRoom = useCallback(() => {
    if (!isDev) return;
    if (!window.confirm("Reset room? This deletes all shapes in this room (dev-only).")) return;
    clearRoomRecords();
    window.location.reload();
  }, [isDev, clearRoomRecords]);

  // Track editor in state so useEffect can depend on it
  const [editor, setEditor] = useState<Editor | null>(null);

  // Track selected entity shape
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);

  // ── Editor mount ─────────────────────────────────────────────────────────────

  const handleMount = useCallback((ed: Editor) => {
    editorRef.current = ed;
    setEditor(ed);
  }, []);

  // ── Subscribe to store changes for selection tracking ─────────────────────────

  useEffect(() => {
    if (!editor) return;
    const unsub = store.listen(
      () => {
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
      },
      { source: "user" },
    );
    return unsub; // ← React uses this as cleanup
  }, [editor, store]);

  // ── Canvas shape sync on mount ───────────────────────────────────────────────

  useEffect(() => {
    if (loadingState !== "ready") return;
    const ed = editorRef.current;
    if (!ed) return;

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
        const existingShapes = ed
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

          ed.createShapes<EntityShape>([
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

  // ── Context menu state (right-click "Add entity") ─────────────────────────────

  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
  } | null>(null);

  // ── Create entity ─────────────────────────────────────────────────────────────

  const handleCreateEntity = useCallback(
    async (type: EntityType, defaultName: string, position?: { x: number; y: number }) => {
      const ed = editorRef.current;
      if (!ed) return;

      const provisionalId = createId();

      // Position at the explicit point if provided (right-click flow);
      // otherwise center the new shape in the current viewport.
      let x: number;
      let y: number;
      if (position) {
        x = position.x - 100;
        y = position.y - 60;
      } else {
        const viewportBounds = ed.getViewportPageBounds();
        x = viewportBounds.minX + viewportBounds.width / 2 - 100;
        y = viewportBounds.minY + viewportBounds.height / 2 - 60;
      }

      const shapeId = `shape:${createId()}` as TLShapeId;

      // Optimistically create the shape
      ed.createShapes<EntityShape>([
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
        ed.deleteShapes([shapeId]);
        toast.error(result.error ?? tCommon("error"));
        return;
      }

      // Update shape with real entityId and displayName from server
      const entity = result.data;
      const displayName = getEntityDisplayName(entity as unknown as Record<string, unknown>, type);

      ed.updateShapes<EntityShape>([
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
    [orgId, projectId, branchId, tCommon],
  );

  // ── Right-click handler: suppress tldraw's menu on empty canvas and show ours ─

  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const ed = editorRef.current;
    if (!ed) return;

    const page = ed.screenToPage({ x: e.clientX, y: e.clientY });
    const hit = ed.getShapeAtPoint(page);
    if (hit) return; // let tldraw handle right-click on shapes

    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ clientX: e.clientX, clientY: e.clientY, pageX: page.x, pageY: page.y });
  }, []);

  // Dismiss the context menu on outside click or Escape.
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

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
        <p className="text-sm text-red-500">{tCommon("error")}</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full" onContextMenu={handleContextMenu}>
      {/* Entity type toolbar — RTL-safe: ltr:left-4 rtl:right-4 */}
      <div className="absolute top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 rounded-lg border border-[#d9d9dd] bg-white p-2 shadow-sm ltr:left-4 rtl:right-4">
        {ENTITY_TYPE_KEYS.map(({ type, tKey, Icon }) => {
          const label = t(tKey);
          return (
            <button
              key={type}
              type="button"
              title={label}
              onClick={() => void handleCreateEntity(type, label)}
              className="flex flex-col items-center gap-1 rounded-md p-2 text-[#17171c] transition-colors hover:bg-[#f5f5f7] active:bg-[#eaeaec]"
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Dev-only: nuke the Liveblocks LiveMap to recover from schema crashes. */}
      {isDev && (
        <button
          type="button"
          onClick={handleResetRoom}
          title="Dev only: clear all shapes in this Liveblocks room"
          className="absolute top-4 z-10 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 ltr:right-4 rtl:left-4"
        >
          Reset room (dev)
        </button>
      )}

      {/* tldraw canvas — store already carries default + Entity shape/binding utils. */}
      <Tldraw store={store} shapeUtils={[EntityShapeUtil]} onMount={handleMount} />

      {/* Right-click "Add entity" context menu — only on empty canvas. */}
      {contextMenu && (
        <div
          role="menu"
          aria-label={t("addEntity")}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: contextMenu.clientY, left: contextMenu.clientX }}
          className="absolute z-20 min-w-[180px] rounded-lg border border-[#d9d9dd] bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
            {t("addEntity")}
          </div>
          {ENTITY_TYPE_KEYS.map(({ type, tKey, Icon }) => {
            const label = t(tKey);
            return (
              <button
                key={type}
                role="menuitem"
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  void handleCreateEntity(type, label, {
                    x: contextMenu.pageX,
                    y: contextMenu.pageY,
                  });
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#17171c] hover:bg-[#f5f5f7]"
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Entity panel — Task 9 */}
      {selectedEntityId && selectedEntityType && (
        <EntityPanel
          entityId={selectedEntityId}
          entityType={selectedEntityType}
          orgId={orgId}
          branchId={branchId}
          onDelete={() => {
            // Remove shape from canvas
            if (editorRef.current) {
              const shapes = editorRef.current.getCurrentPageShapes();
              const shape = shapes
                .filter((s): s is EntityShape => s.type === ENTITY_SHAPE_TYPE)
                .find((s) => s.props.entityId === selectedEntityId);
              if (shape) editorRef.current.deleteShapes([shape.id]);
            }
            setSelectedEntityId(null);
            setSelectedEntityType(null);
          }}
          onNameChange={(newName) => {
            if (editorRef.current) {
              const shapes = editorRef.current.getCurrentPageShapes();
              const shape = shapes
                .filter((s): s is EntityShape => s.type === ENTITY_SHAPE_TYPE)
                .find((s) => s.props.entityId === selectedEntityId);
              if (shape) {
                editorRef.current.updateShapes<EntityShape>([
                  {
                    id: shape.id,
                    type: ENTITY_SHAPE_TYPE,
                    props: { displayName: newName },
                  },
                ]);
              }
            }
          }}
        />
      )}
    </div>
  );
}
