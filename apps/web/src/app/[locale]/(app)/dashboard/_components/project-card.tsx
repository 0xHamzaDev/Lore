"use client";

import { useTranslations } from "next-intl";
import { GitBranch, MoreHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import type { Project } from "@lore/db";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const t = useTranslations("Projects");

  return (
    <Card className="group relative transition-colors hover:border-[#d9d9dd]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base font-medium">
            <Link href={ROUTES.projects.canvas(project.id)} className="hover:underline">
              {project.name}
            </Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(project)}>{t("rename")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project)}
                className="text-red-600 focus:text-red-600"
              >
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-[#93939f]" />
          <Badge variant="outline" className="px-1.5 py-0 text-xs">
            {t("branchBadge")}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-[#93939f]">
          {t("lastModified")}: {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
