"use client";

import { useTranslations } from "next-intl";
import type { CommandEditIntent, CommandEditDeleteOp } from "@lore/validators";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lore/ui";

interface Props {
  edit: CommandEditIntent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CommandConfirmDialog({ edit, onConfirm, onCancel }: Props) {
  const t = useTranslations("CommandBar");
  const open = edit !== null;
  const deletes =
    edit?.operations.filter(
      (op): op is CommandEditDeleteOp => op.op === "delete",
    ) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirm.title")}</DialogTitle>
          <DialogDescription>{edit?.summary ?? ""}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 overflow-y-auto rounded-md border border-[#d9d9dd] bg-[#f5f5f7] p-3 text-sm">
          {deletes.map((op) => (
            <li key={op.entityId} className="py-0.5">
              <span className="font-medium">{op.name}</span>{" "}
              <span className="text-[#6b6b73]">({op.entityType})</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("confirm.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("confirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
