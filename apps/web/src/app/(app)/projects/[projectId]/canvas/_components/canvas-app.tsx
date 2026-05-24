"use client";

import "tldraw/tldraw.css";

import { createId } from "@paralleldrive/cuid2";
import type { EntityType } from "@lore/db";
import { Clock, Film, MapPin, Shield, Sparkles, User, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Tldraw } from "tldraw";
import type { Editor, TLComponents, TLShapeId } from "tldraw";
import { toast } from "sonner";

import { ROUTES } from "@lore/utils";
import type { WizardEntity } from "@lore/validators";
import { useStorageStore } from "../_hooks/use-storage-store";
import { createEntity, createWizardEntity, listEntities } from "../_actions";
import { deleteProject } from "@/app/(app)/dashboard/_actions";
import { useWizardStream } from "../_hooks/use-wizard-stream";
import { takeWizardBrief, type WizardBrief } from "../_lib/wizard-handoff";
import { wizardSlot } from "../_lib/wizard-layout";
import { ENTITY_SHAPE_TYPE, EntityShapeUtil } from "./entity-shape-util";
import type { EntityShape } from "./entity-shape-util";
import { useMutation } from "@/lib/liveblocks.config";
import { useRouter } from "@/i18n/navigation";

import { EntityPanel } from "./entity-panel";
import { WizardOverlay } from "./wizard-overlay";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvasAppProps {
  projectId: string;
  branchId: string;
  orgId: string;
  userId: string;
  userName: string;
  isPro: boolean;
  wizardRequested?: boolean;
}

// ─── Entity toolbar config ────────────────────────────────────────────────────

const ENTITY_TYPE_KEYS = [
  { type: "character" as EntityType, tKey: "entityTypes.character", Icon: User },
  { type: "location" as EntityType, tKey: "entityTypes.location", Icon: MapPin },
  { type: "faction" as EntityType, tKey: "entityTypes.faction", Icon: Shield },
  { type: "scene" as EntityType, tKey: "entityTypes.scene", Icon: Film },
  { type: "timeline_event" as EntityType, tKey: "entityTypes.timelineEvent", Icon: Clock },
] as const;

// Disable tldraw's built-in context menu — Phase 3.5 replaces it with the
// custom "Add entity" menu wired below.
const TLDRAW_COMPONENTS: TLComponents = { ContextMenu: null };

// Text-rich fields the "AI Actions" submenu can generate, per entity type.
// Mirrors the multiline fields in entity-panel's FIELD_CONFIG and the server's
// GENERATABLE_FIELDS guard. tKey indexes the "Entity" message namespace.
const AI_ACTION_FIELDS: Record<EntityType, { key: string; tKey: string }[]> = {
  character: [
    { key: "bio", tKey: "bio" },
    { key: "backstory", tKey: "backstory" },
    { key: "voiceSample", tKey: "voiceSample" },
  ],
  location: [
    { key: "description", tKey: "description" },
    { key: "history", tKey: "history" },
  ],
  faction: [
    { key: "description", tKey: "description" },
    { key: "goals", tKey: "goals" },
  ],
  scene: [{ key: "summary", tKey: "summary" }],
  timeline_event: [{ key: "description", tKey: "description" }],
};

// ─── Helper to derive displayName from an AnyEntity-like record ───────────────

function getEntityDisplayName(entity: Record<string, unknown>, type: EntityType): string {
  if (type === "scene" || type === "timeline_event") {
    return typeof entity.title === "string" ? entity.title : "Untitled";
  }
  return typeof entity.name === "string" ? entity.name : "Untitled";
}

// ─── CanvasApp ────────────────────────────────────────────────────────────────

export function CanvasApp(props: CanvasAppProps) {
  const { projectId, branchId, orgId, isPro, wizardRequested } = props;
  // TODO Task 9: pass props.userId and props.userName to EntityPanel for Liveblocks presence

  const t = useTranslations("Canvas");
  const tEntity = useTranslations("Entity");
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
    // Depend on the editor *state*, not editorRef: when the store becomes ready
    // Tldraw has not necessarily fired onMount yet, so editorRef.current can
    // still be null on this pass. Keying off `editor` re-runs the seed once it
    // mounts — without this, a freshly-forked (empty) room never gets its
    // Postgres entities turned into shapes.
    if (!editor) return;
    const ed = editor;

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
  }, [loadingState, branchId, orgId, editor]);

  // ── Context menu state (right-click "Add entity") ─────────────────────────────

  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
  } | null>(null);

  // ── AI Actions menu state (right-click on an entity shape) ─────────────────────

  const [aiMenu, setAiMenu] = useState<{
    clientX: number;
    clientY: number;
    shapeId: TLShapeId;
    entityId: string;
    entityType: EntityType;
  } | null>(null);

  // A field generation requested from the AI Actions menu, handed to the panel
  // to auto-start once it has loaded the entity. Guarded by entityId so a stale
  // request never fires against the wrong entity.
  const [pendingAiField, setPendingAiField] = useState<{
    entityId: string;
    field: string;
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

    if (hit) {
      // Right-click on one of our entity shapes → AI Actions menu. Other shape
      // types fall through to tldraw's default handling.
      if (hit.type === ENTITY_SHAPE_TYPE) {
        const shape = hit as EntityShape;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        setAiMenu({
          clientX: e.clientX,
          clientY: e.clientY,
          shapeId: shape.id,
          entityId: shape.props.entityId,
          entityType: shape.props.entityType,
        });
      }
      return;
    }

    // Empty canvas → "Add entity" menu.
    e.preventDefault();
    e.stopPropagation();
    setAiMenu(null);
    setContextMenu({ clientX: e.clientX, clientY: e.clientY, pageX: page.x, pageY: page.y });
  }, []);

  // Trigger a field generation from the AI Actions menu: select the shape so
  // the panel opens for this entity, then hand the field to the panel to run.
  const handleAiAction = useCallback((menu: NonNullable<typeof aiMenu>, fieldKey: string) => {
    const ed = editorRef.current;
    if (ed) ed.select(menu.shapeId);
    setSelectedEntityId(menu.entityId);
    setSelectedEntityType(menu.entityType);
    setPendingAiField({ entityId: menu.entityId, field: fieldKey });
    setAiMenu(null);
  }, []);

  // Dismiss either menu on outside click or Escape.
  useEffect(() => {
    if (!contextMenu && !aiMenu) return;
    const close = () => {
      setContextMenu(null);
      setAiMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu, aiMenu]);

  // ── AI onboarding wizard (Phase 8) ────────────────────────────────────────────

  const router = useRouter();
  const wizard = useWizardStream();
  // Per-type counters for deterministic grid placement, independent of arrival order.
  const wizardIndexRef = useRef<Record<EntityType, number>>({
    character: 0,
    location: 0,
    faction: 0,
    scene: 0,
    timeline_event: 0,
  });
  const wizardStartedRef = useRef(false);
  // Holds the resolved brief so "Try again" can re-run without re-reading (and
  // re-clearing) sessionStorage, which takeWizardBrief already emptied.
  const lastBriefRef = useRef<WizardBrief | null>(null);

  // Persist one streamed entity, then place its shape at the next grid slot for
  // its type. Returns true only if the Postgres row was created (drives rollback).
  const placeWizardEntity = useCallback(
    async (entity: WizardEntity): Promise<boolean> => {
      const ed = editorRef.current;
      if (!ed) return false;

      const result = await createWizardEntity({ orgId, projectId, branchId, entity });
      if (!result.success) return false;

      const type = entity.entityType as EntityType;
      const index = wizardIndexRef.current[type];
      wizardIndexRef.current[type] = index + 1;
      const { x, y } = wizardSlot(type, index);

      const created = result.data as unknown as Record<string, unknown>;
      const displayName = getEntityDisplayName(created, type);

      ed.createShapes<EntityShape>([
        {
          id: `shape:${createId()}` as TLShapeId,
          type: ENTITY_SHAPE_TYPE,
          x,
          y,
          props: { entityId: result.data.id, entityType: type, displayName, w: 200, h: 120 },
        },
      ]);
      return true;
    },
    [orgId, projectId, branchId],
  );

  const resetWizardIndices = useCallback(() => {
    wizardIndexRef.current = {
      character: 0,
      location: 0,
      faction: 0,
      scene: 0,
      timeline_event: 0,
    };
  }, []);

  // Kick off the wizard once: the editor must be mounted and a brief must be
  // present in sessionStorage (cleared on read, so a refresh won't re-run it).
  useEffect(() => {
    if (!wizardRequested || wizardStartedRef.current) return;
    if (!editor) return;
    const handoff = takeWizardBrief(projectId);
    if (!handoff) return;
    wizardStartedRef.current = true;
    lastBriefRef.current = handoff;
    resetWizardIndices();
    wizard.start({
      projectId,
      brief: handoff.brief,
      locale: handoff.locale,
      onEntity: placeWizardEntity,
    });
  }, [wizardRequested, editor, projectId, wizard, placeWizardEntity, resetWizardIndices]);

  // "Try again" (only offered when zero entities were created): re-run with the
  // brief we cached on the first attempt.
  const handleWizardRetry = useCallback(() => {
    const brief = lastBriefRef.current;
    if (!brief) return;
    resetWizardIndices();
    wizard.start({
      projectId,
      brief: brief.brief,
      locale: brief.locale,
      onEntity: placeWizardEntity,
    });
  }, [projectId, wizard, placeWizardEntity, resetWizardIndices]);

  // Dismiss: zero entities created → roll back the empty project; otherwise keep it.
  const handleWizardDismiss = useCallback(() => {
    if (wizard.count === 0) {
      void deleteProject({ projectId, orgId }).finally(() => {
        router.push(ROUTES.dashboard);
      });
      return;
    }
    wizard.reset();
  }, [wizard, projectId, orgId, router]);

  // Free-tier defense in depth: a backend 402 (the dialog already gates this
  // client-side) → roll back the empty project and bounce to the dashboard.
  useEffect(() => {
    if (!wizard.upgradeRequired) return;
    void deleteProject({ projectId, orgId }).finally(() => router.push(ROUTES.dashboard));
  }, [wizard.upgradeRequired, projectId, orgId, router]);

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
      {/* AI onboarding wizard overlay (Phase 8) — covers the canvas while streaming. */}
      <WizardOverlay
        status={wizard.status}
        count={wizard.count}
        onRetry={handleWizardRetry}
        onDismiss={handleWizardDismiss}
      />

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
          className="absolute left-1/2 top-2 z-[100] -translate-x-1/2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
        >
          Reset room (dev)
        </button>
      )}

      {/* tldraw canvas — store already carries default + Entity shape/binding utils. */}
      <Tldraw
        store={store}
        shapeUtils={[EntityShapeUtil]}
        components={TLDRAW_COMPONENTS}
        onMount={handleMount}
      />

      {/* Right-click "Add entity" context menu — only on empty canvas. */}
      {contextMenu && (
        <div
          role="menu"
          aria-label={t("addEntity")}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: contextMenu.clientY, left: contextMenu.clientX }}
          className="absolute z-[200] min-w-[180px] rounded-lg border border-[#d9d9dd] bg-white py-1 shadow-lg"
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

      {/* Right-click "AI Actions" menu — only on entity shapes. */}
      {aiMenu && (
        <div
          role="menu"
          aria-label={t("ai.aiActions")}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ top: aiMenu.clientY, left: aiMenu.clientX }}
          className="absolute z-[200] min-w-[200px] rounded-lg border border-[#d9d9dd] bg-white py-1 shadow-lg"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#003c33]">
            <Sparkles size={12} />
            {t("ai.aiActions")}
          </div>
          {AI_ACTION_FIELDS[aiMenu.entityType].map(({ key, tKey }) => {
            const fieldLabel = tEntity(tKey as Parameters<typeof tEntity>[0]);
            return (
              <button
                key={key}
                role="menuitem"
                type="button"
                onClick={() => handleAiAction(aiMenu, key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#17171c] hover:bg-[#f5f5f7]"
              >
                <Wand2 size={14} className="text-[#003c33]" />
                <span>{t("ai.generateField", { field: fieldLabel })}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Entity panel */}
      {selectedEntityId && selectedEntityType && (
        <EntityPanel
          entityId={selectedEntityId}
          entityType={selectedEntityType}
          orgId={orgId}
          projectId={projectId}
          branchId={branchId}
          isPro={isPro}
          initialGenerateField={
            pendingAiField && pendingAiField.entityId === selectedEntityId
              ? pendingAiField.field
              : null
          }
          onInitialGenerateConsumed={() => setPendingAiField(null)}
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
