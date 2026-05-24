"use client";

import { useCallback, useState } from "react";
import type {
  CommandIntent,
  CommandEditIntent,
  CommandEditPatchOp,
  CommandEditDeleteOp,
} from "@lore/validators";
import { createWizardEntity, updateEntity, deleteEntity } from "../_actions";

type CommandState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "create_done"; count: number }
  | { kind: "edit_done"; patched: number }
  | { kind: "destructive_pending"; edit: CommandEditIntent }
  | { kind: "delete_done"; deleted: number; failed: number }
  | { kind: "query"; question: string }
  | { kind: "agent_trigger"; message: string }
  | { kind: "unknown"; message: string }
  | { kind: "requires_pro"; intent: string }
  | { kind: "error"; message: string };

export interface UseCommandArgs {
  orgId: string;
  projectId: string;
  branchId: string;
  locale: "ar" | "en";
}

export interface UseCommandResult {
  state: CommandState;
  submit: (instruction: string) => Promise<void>;
  confirmDestructive: () => Promise<void>;
  cancelDestructive: () => void;
  reset: () => void;
}

type CommandResponse =
  | (CommandIntent & { requiresPro?: undefined })
  | { requiresPro: true; intent: string };

export function useCommand(args: UseCommandArgs): UseCommandResult {
  const [state, setState] = useState<CommandState>({ kind: "idle" });

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  const submit = useCallback(
    async (instruction: string) => {
      setState({ kind: "loading" });
      let resp: Response;
      try {
        resp = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: args.projectId,
            branchId: args.branchId,
            instruction,
            locale: args.locale,
          }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ kind: "error", message });
        return;
      }

      if (!resp.ok) {
        setState({ kind: "error", message: `request_failed_${resp.status}` });
        return;
      }

      const body = (await resp.json().catch(() => null)) as CommandResponse | null;
      if (!body) {
        setState({ kind: "error", message: "invalid_response" });
        return;
      }

      if ("requiresPro" in body && body.requiresPro) {
        setState({ kind: "requires_pro", intent: body.intent });
        return;
      }

      switch (body.intent) {
        case "create": {
          // Track type alongside id so rollback hits the right table — the
          // model can mix entity types in one create, and using the current
          // loop iteration's type would route deletes to the wrong table.
          const created: Array<{
            entityId: string;
            type: (typeof body.entities)[number]["entityType"];
          }> = [];
          let creationFailed = false;
          for (const entity of body.entities) {
            const res = await createWizardEntity({
              orgId: args.orgId,
              projectId: args.projectId,
              branchId: args.branchId,
              entity,
            });
            if (res.success) {
              created.push({ entityId: res.data.id, type: entity.entityType });
            } else {
              creationFailed = true;
              break;
            }
          }
          if (creationFailed) {
            for (const c of [...created].reverse()) {
              await deleteEntity({ type: c.type, entityId: c.entityId, orgId: args.orgId });
            }
            setState({ kind: "error", message: "create_failed" });
            return;
          }
          setState({ kind: "create_done", count: created.length });
          return;
        }
        case "edit": {
          if (body.destructive) {
            setState({ kind: "destructive_pending", edit: body });
            return;
          }
          const patches = body.operations.filter(
            (op): op is CommandEditPatchOp => op.op === "patch",
          );
          let patched = 0;
          for (const op of patches) {
            const res = await updateEntity({
              type: op.entityType,
              entityId: op.entityId,
              orgId: args.orgId,
              patch: { [op.field]: op.suggestedValue },
            });
            if (res.success) patched += 1;
          }
          setState({ kind: "edit_done", patched });
          return;
        }
        case "query":
          setState({ kind: "query", question: instruction });
          return;
        case "agent_trigger":
          setState({ kind: "agent_trigger", message: body.message });
          return;
        case "unknown":
          setState({ kind: "unknown", message: body.message });
          return;
      }
    },
    [args.orgId, args.projectId, args.branchId, args.locale],
  );

  const confirmDestructive = useCallback(async () => {
    if (state.kind !== "destructive_pending") return;
    const deletes = state.edit.operations.filter(
      (op): op is CommandEditDeleteOp => op.op === "delete",
    );
    let deleted = 0;
    let failed = 0;
    for (const op of deletes) {
      const res = await deleteEntity({
        type: op.entityType,
        entityId: op.entityId,
        orgId: args.orgId,
      });
      if (res.success) deleted += 1;
      else failed += 1;
    }
    setState({ kind: "delete_done", deleted, failed });
  }, [state, args.orgId]);

  const cancelDestructive = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  return { state, submit, confirmDestructive, cancelDestructive, reset };
}
