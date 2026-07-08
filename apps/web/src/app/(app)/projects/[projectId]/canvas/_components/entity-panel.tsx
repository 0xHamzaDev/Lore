"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, Wand2 } from "lucide-react";
import { Button, Input, Label, Textarea } from "@lore/ui";

import type { EntityType } from "@lore/db";
import { UpgradeModal } from "@/components/upgrade-modal";
import {
  listEntities,
  updateEntity,
  deleteEntity,
  acceptFieldSuggestion,
} from "../_actions";
import { useFieldGeneration } from "../_hooks/use-field-generation";
import { FieldSuggestion } from "./field-suggestion";

// ─── Field config ─────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  tKey: string;
  multiline?: boolean;
  isNameField?: boolean;
}

const FIELD_CONFIG: Record<EntityType, FieldDef[]> = {
  character: [
    { key: "name", tKey: "name", isNameField: true },
    { key: "age", tKey: "age" },
    { key: "role", tKey: "role" },
    { key: "bio", tKey: "bio", multiline: true },
    { key: "backstory", tKey: "backstory", multiline: true },
    { key: "voiceSample", tKey: "voiceSample", multiline: true },
  ],
  location: [
    { key: "name", tKey: "name", isNameField: true },
    { key: "climate", tKey: "climate" },
    { key: "culture", tKey: "culture" },
    { key: "description", tKey: "description", multiline: true },
    { key: "history", tKey: "history", multiline: true },
  ],
  faction: [
    { key: "name", tKey: "name", isNameField: true },
    { key: "ideology", tKey: "ideology" },
    { key: "description", tKey: "description", multiline: true },
    { key: "goals", tKey: "goals", multiline: true },
  ],
  scene: [
    { key: "title", tKey: "title", isNameField: true },
    { key: "beat", tKey: "beat" },
    { key: "sceneOrder", tKey: "order" },
    { key: "summary", tKey: "summary", multiline: true },
  ],
  timeline_event: [
    { key: "title", tKey: "title", isNameField: true },
    { key: "date", tKey: "date" },
    { key: "significance", tKey: "significance" },
    { key: "description", tKey: "description", multiline: true },
  ],
};

const ENTITY_TYPE_KEY: Record<EntityType, string> = {
  character: "entityTypes.character",
  location: "entityTypes.location",
  faction: "entityTypes.faction",
  scene: "entityTypes.scene",
  timeline_event: "entityTypes.timelineEvent",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface EntityPanelProps {
  entityId: string;
  entityType: EntityType;
  orgId: string;
  projectId: string;
  branchId: string;
  isPro: boolean;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  /** When set (from the canvas "AI Actions" menu), auto-starts generation for this field once the entity loads. */
  initialGenerateField?: string | null;
  onInitialGenerateConsumed?: () => void;
}

// ─── EntityPanel ──────────────────────────────────────────────────────────────

export function EntityPanel({
  entityId,
  entityType,
  orgId,
  projectId,
  branchId,
  isPro,
  onDelete,
  onNameChange,
  initialGenerateField,
  onInitialGenerateConsumed,
}: EntityPanelProps) {
  const t = useTranslations("Canvas");
  const tEntity = useTranslations("Entity");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const gen = useFieldGeneration();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Local field values keyed by field key
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce timers per field
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  // ── Load entity on mount / entityId change ───────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFieldValues({});

    void (async () => {
      const result = await listEntities(entityType, branchId, orgId);
      if (cancelled) return;

      if (!result.success) {
        setIsLoading(false);
        return;
      }

      const entity = result.data.find((e) => e.id === entityId);
      if (!entity) {
        setIsLoading(false);
        return;
      }

      const rec = entity as unknown as Record<string, unknown>;
      const fields = FIELD_CONFIG[entityType] ?? [];
      const values: Record<string, string> = {};
      for (const field of fields) {
        const raw = rec[field.key];
        values[field.key] =
          raw !== null && raw !== undefined ? String(raw) : "";
      }

      setFieldValues(values);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, branchId, orgId]);

  // ── Field change handler ──────────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (fieldKey: string, value: string, isNameField: boolean) => {
      setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));

      // Update canvas shape name immediately on name/title change
      if (isNameField) {
        onNameChange(value);
      }

      // Clear existing debounce timer for this field
      if (debounceTimers.current[fieldKey]) {
        clearTimeout(debounceTimers.current[fieldKey]);
      }

      // Set new debounce timer
      debounceTimers.current[fieldKey] = setTimeout(() => {
        setIsSaving(true);
        void updateEntity({
          type: entityType,
          entityId,
          orgId,
          patch: { [fieldKey]: value },
        }).then((result) => {
          setIsSaving(false);
          if (!result.success) {
            toast.error(tCommon("error"));
          }
        });
      }, 1000);
    },
    [entityType, entityId, orgId, onNameChange, tCommon],
  );

  // ── Delete handler ────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;

    const result = await deleteEntity({ type: entityType, entityId, orgId });
    if (!result.success) {
      toast.error(tCommon("error"));
      return;
    }

    onDelete();
  }, [t, tCommon, entityType, entityId, orgId, onDelete]);

  // ── AI generation handlers ──────────────────────────────────────────────────

  // Free users never reach the network: the wand opens the upgrade modal here,
  // before any fetch. (The route handler also 402s as defense in depth.)
  const startGeneration = useCallback(
    (fieldKey: string, fieldLabel: string) => {
      if (!isPro) {
        setUpgradeOpen(true);
        return;
      }
      gen.start({
        projectId,
        entityType,
        fieldKey,
        fieldLabel,
        context: fieldValues,
        locale,
      });
    },
    [isPro, gen, projectId, entityType, fieldValues, locale],
  );

  const handleAccept = useCallback(
    async (fieldKey: string) => {
      const value = gen.suggestion;
      const result = await acceptFieldSuggestion({
        type: entityType,
        entityId,
        orgId,
        fieldKey,
        value,
        aiRunId: gen.meta?.aiRunId ?? null,
      });
      if (!result.success) {
        toast.error(tCommon("error"));
        return;
      }
      // acceptFieldSuggestion already persisted the field, so update local state
      // directly without re-triggering the debounced autosave.
      setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
      gen.reset();
    },
    [gen, entityType, entityId, orgId, tCommon],
  );

  // A 402 from the route handler (subscription lapsed mid-session) routes to the
  // upgrade modal instead of the inline error.
  useEffect(() => {
    if (gen.upgradeRequired) {
      setUpgradeOpen(true);
      gen.reset();
    }
  }, [gen.upgradeRequired, gen]);

  // Auto-start a generation requested from the canvas "AI Actions" menu, once
  // the entity's fields have loaded (so the prompt gets full context).
  useEffect(() => {
    if (!initialGenerateField || isLoading) return;
    const field = (FIELD_CONFIG[entityType] ?? []).find(
      (f) => f.key === initialGenerateField,
    );
    if (field) {
      startGeneration(
        field.key,
        tEntity(field.tKey as Parameters<typeof tEntity>[0]),
      );
    }
    onInitialGenerateConsumed?.();
  }, [
    initialGenerateField,
    isLoading,
    entityType,
    startGeneration,
    tEntity,
    onInitialGenerateConsumed,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────

  const fields = FIELD_CONFIG[entityType] ?? [];

  return (
    <div className="absolute inset-y-0 end-0 z-10 flex w-80 flex-col border-s border-[#d9d9dd] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d9d9dd] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#17171c]">
            {t(ENTITY_TYPE_KEY[entityType])}
          </span>
          {isSaving && (
            <span className="text-xs text-[#93939f]">{t("saving")}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          title={t("deleteEntity")}
          onClick={() => void handleDelete()}
          className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#003c33] border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {fields.map((field) => {
              const value = fieldValues[field.key] ?? "";
              const label = tEntity(
                field.tKey as Parameters<typeof tEntity>[0],
              );
              const fieldId = `entity-field-${field.key}`;

              const isGenerating =
                gen.fieldKey === field.key && gen.status !== "idle";

              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={fieldId}
                      className="text-xs font-medium text-[#5d5d6e]"
                    >
                      {label}
                    </Label>
                    {/* Wand only on text-rich (multiline) fields — Phase 7. */}
                    {field.multiline && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t("ai.generate")}
                        aria-label={t("ai.generate")}
                        disabled={isGenerating}
                        onClick={() => startGeneration(field.key, label)}
                        className="h-6 w-6 text-[#003c33] hover:bg-[#003c33]/10 disabled:opacity-40"
                      >
                        <Wand2 size={13} />
                      </Button>
                    )}
                  </div>
                  {field.multiline ? (
                    <Textarea
                      id={fieldId}
                      value={value}
                      rows={3}
                      onChange={(e) =>
                        handleFieldChange(
                          field.key,
                          e.target.value,
                          field.isNameField ?? false,
                        )
                      }
                      className="resize-none text-sm"
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      value={value}
                      onChange={(e) =>
                        handleFieldChange(
                          field.key,
                          e.target.value,
                          field.isNameField ?? false,
                        )
                      }
                      className="text-sm"
                    />
                  )}
                  {isGenerating && (
                    <FieldSuggestion
                      current={value}
                      status={gen.status}
                      suggestion={gen.suggestion}
                      onAccept={() => void handleAccept(field.key)}
                      onRegenerate={() => startGeneration(field.key, label)}
                      onDiscard={() => gen.reset()}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="ai"
      />
    </div>
  );
}
