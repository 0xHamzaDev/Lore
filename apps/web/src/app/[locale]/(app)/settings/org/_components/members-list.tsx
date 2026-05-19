"use client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar, AvatarFallback, Badge, Button } from "@lore/ui";
import { removeMemberAction, updateMemberRoleAction } from "../_actions";
import type { OrgRole } from "@lore/db";

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

export function MembersList({ orgId, members, currentUserId, currentUserRole }: MembersListProps) {
  const t = useTranslations("Settings.org");
  const isOwner = currentUserRole === "owner";

  async function handleRemove(memberId: string) {
    if (!confirm(t("removeConfirm"))) return;
    const result = await removeMemberAction({ orgId, memberId });
    if (result.success) toast.success(t("memberRemoved"));
    else toast.error(result.error);
  }

  async function handleRoleChange(memberId: string, role: OrgRole) {
    const result = await updateMemberRoleAction({ orgId, memberId, role });
    if (result.success) toast.success(t("roleUpdated"));
    else toast.error(result.error);
  }

  return (
    <ul className="divide-y divide-[#e5e7eb]">
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

        return (
          <li key={member.id} className="flex items-center gap-3 py-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[#17171c]">
                {member.user.name || member.user.email}
              </p>
              <p className="truncate text-xs text-[#93939f]">{member.user.email}</p>
            </div>
            <Badge variant="outline">{t(`roles.${member.role}`)}</Badge>
            {isOwner && !isSelf && member.role !== "owner" && (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                  className="rounded-sm border border-[#d9d9dd] px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="editor">{t("roles.editor")}</option>
                  <option value="viewer">{t("roles.viewer")}</option>
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(member.id)}
                  className="text-[#b30000] hover:text-[#b30000]"
                >
                  {t("removeMember")}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
