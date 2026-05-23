"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, GitBranch, Loader2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lore/ui";

import { usePathname, useRouter } from "@/i18n/navigation";
import { ForkBranchDialog } from "./fork-branch-dialog";

interface BranchSummary {
  id: string;
  name: string;
}

interface BranchSwitcherProps {
  projectId: string;
  orgId: string;
  currentBranchId: string;
  branches: BranchSummary[];
}

export function BranchSwitcher({
  projectId,
  orgId,
  currentBranchId,
  branches,
}: BranchSwitcherProps) {
  const t = useTranslations("Canvas.branch");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [forkOpen, setForkOpen] = useState(false);

  const currentBranch = branches.find((b) => b.id === currentBranchId);

  function switchTo(branchId: string) {
    if (branchId === currentBranchId) return;
    startTransition(() => {
      router.push(`${pathname}?branchId=${branchId}`);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            className="flex items-center gap-2 rounded-md border border-[#d9d9dd] bg-white px-3 py-1.5 text-sm font-medium text-[#17171c] transition-colors hover:bg-[#f5f5f7] disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin text-[#6b7280]" />
            ) : (
              <GitBranch size={15} className="text-[#6b7280]" />
            )}
            <span className="max-w-[180px] truncate">{currentBranch?.name ?? "main"}</span>
            <ChevronsUpDown size={14} className="text-[#9ca3af]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
          {branches.map((branch) => {
            const isCurrent = branch.id === currentBranchId;
            return (
              <DropdownMenuItem
                key={branch.id}
                onSelect={() => switchTo(branch.id)}
                className="flex items-center gap-2"
              >
                <Check
                  size={15}
                  className={isCurrent ? "text-[#003c33]" : "opacity-0"}
                  aria-hidden={!isCurrent}
                />
                <span className="truncate">{branch.name}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setForkOpen(true)} className="flex items-center gap-2">
            <Plus size={15} className="text-[#6b7280]" />
            <span>{t("fork")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ForkBranchDialog
        open={forkOpen}
        onClose={() => setForkOpen(false)}
        projectId={projectId}
        orgId={orgId}
        sourceBranchId={currentBranchId}
        onForked={(newBranchId) => {
          setForkOpen(false);
          startTransition(() => {
            router.push(`${pathname}?branchId=${newBranchId}`);
          });
        }}
      />
    </>
  );
}
