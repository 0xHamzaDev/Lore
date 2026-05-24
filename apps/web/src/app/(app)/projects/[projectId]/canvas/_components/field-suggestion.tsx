"use client";

import { useTranslations } from "next-intl";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@lore/ui";

import type { FieldGenStatus } from "../_hooks/use-field-generation";

interface FieldSuggestionProps {
  current: string;
  status: FieldGenStatus;
  suggestion: string;
  onAccept: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}

// Inline diff shown beneath a field while an AI suggestion is active: the
// current value (muted) above the streaming suggestion, with Accept /
// Regenerate / Discard. Accept is only enabled once the stream finishes.
export function FieldSuggestion({
  current,
  status,
  suggestion,
  onAccept,
  onRegenerate,
  onDiscard,
}: FieldSuggestionProps) {
  const t = useTranslations("Canvas");

  if (status === "error") {
    return (
      <div className="mt-1.5 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs">
        <p className="text-red-700">{t("ai.error")}</p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRegenerate}
            className="h-7 gap-1 text-xs"
          >
            <RefreshCw size={12} />
            {t("ai.tryAgain")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            className="h-7 gap-1 text-xs"
          >
            <X size={12} />
            {t("ai.discard")}
          </Button>
        </div>
      </div>
    );
  }

  const isStreaming = status === "streaming";
  const isDone = status === "done";

  return (
    <div className="mt-1.5 rounded-md border border-[#003c33]/30 bg-[#003c33]/[0.03] p-2.5">
      {current.trim().length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#93939f]">
            {t("ai.current")}
          </span>
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-[#93939f] line-through decoration-[#cfcfd6]">
            {current}
          </p>
        </div>
      )}

      <div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-[#003c33]">
          {t("ai.suggestion")}
        </span>
        <p className="mt-0.5 min-h-[1.25rem] whitespace-pre-wrap text-xs text-[#17171c]">
          {suggestion}
          {isStreaming && (
            <span className="ms-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#003c33] align-middle" />
          )}
        </p>
      </div>

      <div className="mt-2.5 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          disabled={!isDone || suggestion.trim().length === 0}
          className="h-7 gap-1 rounded-full text-xs"
        >
          <Check size={12} />
          {t("ai.accept")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRegenerate}
          disabled={isStreaming}
          className="h-7 gap-1 text-xs"
        >
          <RefreshCw size={12} />
          {t("ai.regenerate")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDiscard}
          className="h-7 gap-1 text-xs"
        >
          <X size={12} />
          {t("ai.discard")}
        </Button>
      </div>
    </div>
  );
}
