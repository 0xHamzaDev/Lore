"use client";

import { useTranslations } from "next-intl";
import { Button, ErrorState } from "@lore/ui";

/**
 * Canvas-scoped error boundary. A render crash inside the tldraw canvas (e.g. a
 * malformed record that slips past the seed guard) is caught here instead of
 * bubbling to the project-level boundary, so the branch chrome stays intact and
 * a single retry re-mounts just the board.
 */
export default function CanvasError({ reset }: { reset: () => void }) {
  const t = useTranslations();

  return (
    <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
      <ErrorState
        title={t("Canvas.errorTitle")}
        description={t("Canvas.errorDescription")}
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            {t("Common.retry")}
          </Button>
        }
      />
    </div>
  );
}
