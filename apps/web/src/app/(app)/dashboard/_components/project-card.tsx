"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import type { Project } from "@lore/db";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lore/ui";

interface ProjectCardProps {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function formatRelative(date: string | Date, locale: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60_000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  if (days < 30) return rtf.format(-days, "day");
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const t = useTranslations("Projects");
  const tCommon = useTranslations("Common");
  const tDash = useTranslations("Dashboard");

  return (
    <article className="group relative flex flex-col gap-4 rounded-sm border border-card-border bg-canvas p-5 transition-colors hover:border-hairline">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {tDash("title")} · {formatRelative(project.updatedAt, "en")}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 -me-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t("menu")}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(project)}>{t("rename")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(project)}
              className="text-error focus:text-error"
            >
              {tCommon("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="text-lg font-medium leading-snug text-primary line-clamp-2">
        <Link
          href={ROUTES.projects.canvas(project.id)}
          className="after:absolute after:inset-0 hover:underline"
        >
          {project.name}
        </Link>
      </h3>

      <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted">
        <span className="inline-flex items-center rounded-xs border border-border-light px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
          {t("branchBadge")}
        </span>
      </div>
    </article>
  );
}
