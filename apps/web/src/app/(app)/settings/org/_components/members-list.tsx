"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  EmptyState,
} from "@lore/ui";
import { Users } from "lucide-react";
import type { OrgRole } from "@lore/db";
import { removeMemberAction, updateMemberRoleAction } from "../_actions";

interface Member {
  id: string;
  userId: string;
  role: OrgRole;
  user: { name: string; email: string; image?: string | null };
}

interface MembersListProps {
  orgId: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: OrgRole;
}

export function MembersList({
  orgId,
  members,
  currentUserId,
  currentUserRole,
}: MembersListProps) {
  const t = useTranslations("Settings.org");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const isOwner = currentUserRole === "owner";

  function handleRemove(memberId: string) {
    if (!confirm(t("removeConfirm"))) return;
    startTransition(async () => {
      const result = await removeMemberAction({ orgId, memberId });
      if (result.success) toast.success(t("memberRemoved"));
      else toast.error(tCommon("error"));
    });
  }

  function handleRoleChange(memberId: string, role: OrgRole) {
    startTransition(async () => {
      const result = await updateMemberRoleAction({ orgId, memberId, role });
      if (result.success) toast.success(t("roleUpdated"));
      else toast.error(tCommon("error"));
    });
  }

  if (members.length === 0) {
    return <EmptyState icon={Users} title={t("noMembers")} />;
  }

  return (
    <ul className="divide-y divide-border-light rounded-md border border-border-light bg-canvas">
      {members.map((member) => {
        const initials = member.user.name
          ? member.user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : (member.user.email[0]?.toUpperCase() ?? "?");
        const isSelf = member.userId === currentUserId;
        const canEdit = isOwner && !isSelf && member.role !== "owner";

        return (
          <li key={member.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {member.user.name || member.user.email}
              </p>
              <p className="truncate text-xs text-body-muted">
                {member.user.email}
              </p>
            </div>

            {canEdit ? (
              <select
                value={member.role}
                disabled={isPending}
                onChange={(e) =>
                  handleRoleChange(member.id, e.target.value as OrgRole)
                }
                className="rounded-xs border border-border-light bg-canvas px-2 py-1 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="editor">{t("roles.editor")}</option>
                <option value="viewer">{t("roles.viewer")}</option>
              </select>
            ) : (
              <Badge variant="outline">{t(`roles.${member.role}`)}</Badge>
            )}

            {canEdit ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleRemove(member.id)}
                className="text-error hover:text-error"
              >
                {t("removeMember")}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
