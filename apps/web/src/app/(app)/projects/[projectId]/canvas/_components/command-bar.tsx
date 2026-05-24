"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogContent, Textarea } from "@lore/ui";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useCommand } from "../_hooks/use-command";
import { useCommandQueryStream } from "../_hooks/use-command-query-stream";
import { CommandConfirmDialog } from "./command-confirm-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  branchId: string;
  locale: "ar" | "en";
}

export function CommandBar({ open, onOpenChange, orgId, projectId, branchId, locale }: Props) {
  const t = useTranslations("CommandBar");
  const [instruction, setInstruction] = useState("");
  const cmd = useCommand({ orgId, projectId, branchId, locale });
  const query = useCommandQueryStream({ projectId, branchId, locale });
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Reset state every time the bar opens — never carry leftover results across opens.
  useEffect(() => {
    if (open) {
      setInstruction("");
      cmd.reset();
      query.reset();
      setShowUpgrade(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When the classifier returns `query`, kick off the streaming answer.
  // When it returns `requires_pro`, surface the upgrade modal.
  useEffect(() => {
    if (cmd.state.kind === "query") {
      void query.start(cmd.state.question);
    }
    if (cmd.state.kind === "requires_pro") {
      setShowUpgrade(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd.state]);

  const submit = async () => {
    const value = instruction.trim();
    if (!value) return;
    await cmd.submit(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const pendingDestructiveEdit = cmd.state.kind === "destructive_pending" ? cmd.state.edit : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          // Position centered, upper third of the viewport. Default Dialog
          // centers vertically; override `top` to land in the upper third.
          className="top-[28%] max-w-2xl translate-y-0 gap-3 p-4"
        >
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            rows={2}
            autoFocus
            disabled={cmd.state.kind === "loading"}
            dir={locale === "ar" ? "rtl" : "ltr"}
          />
          <div className="flex items-center justify-end gap-2">
            {query.status === "streaming" ? (
              <Button variant="ghost" onClick={query.stop}>
                {t("stop")}
              </Button>
            ) : null}
            <Button onClick={submit} disabled={cmd.state.kind === "loading" || !instruction.trim()}>
              {cmd.state.kind === "loading" ? t("loading") : t("submit")}
            </Button>
          </div>

          {/* Result panel */}
          <ResultPanel state={cmd.state} query={query} />
        </DialogContent>
      </Dialog>

      <CommandConfirmDialog
        edit={pendingDestructiveEdit}
        onConfirm={() => void cmd.confirmDestructive()}
        onCancel={cmd.cancelDestructive}
      />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          onOpenChange(false);
        }}
        reason="ai"
      />
    </>
  );
}

function ResultPanel({
  state,
  query,
}: {
  state: ReturnType<typeof useCommand>["state"];
  query: ReturnType<typeof useCommandQueryStream>;
}) {
  const t = useTranslations("CommandBar");
  if (state.kind === "create_done") {
    return (
      <p className="text-sm text-[#6b6b73]">{t("result.createDone", { count: state.count })}</p>
    );
  }
  if (state.kind === "edit_done") {
    return (
      <p className="text-sm text-[#6b6b73]">{t("result.editDone", { patched: state.patched })}</p>
    );
  }
  if (state.kind === "delete_done") {
    return (
      <p className="text-sm text-[#6b6b73]">
        {t("result.deleteDone", { deleted: state.deleted, failed: state.failed })}
      </p>
    );
  }
  if (state.kind === "agent_trigger") {
    return <p className="text-sm text-[#6b6b73]">{t("result.agentQueued")}</p>;
  }
  if (state.kind === "unknown") {
    return <p className="text-sm text-[#6b6b73]">{state.message || t("result.unknown")}</p>;
  }
  if (state.kind === "error") {
    return <p className="text-sm text-error">{t("errors.generic")}</p>;
  }
  if (state.kind === "query") {
    return (
      <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#d9d9dd] bg-[#f5f5f7] p-3 text-sm">
        {query.text || t("loading")}
        {query.status === "error" ? (
          <span className="block pt-2 text-error">{t("result.queryError")}</span>
        ) : null}
      </div>
    );
  }
  return null;
}
