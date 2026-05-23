"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Badge, Button, EmptyState } from "@lore/ui";
import type { OrgRole } from "@lore/db";
import { cancelInvitationAction } from "../_actions";

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: Date;
}

interface InvitationsListProps {
  orgId: string;
  invitations: Invitation[];
  canManage: boolean;
}

export function InvitationsList({ orgId, invitations, canManage }: InvitationsListProps) {
  const t = useTranslations("Settings.org");
  const [isPending, startTransition] = useTransition();

  function handleCancel(invitationId: string) {
    startTransition(async () => {
      const result = await cancelInvitationAction({ orgId, invitationId });
      if (result.success) toast.success(t("invitationRevoked"));
      else toast.error(result.error);
    });
  }

  if (invitations.length === 0) {
    return <EmptyState icon={Mail} title={t("noInvitations")} />;
  }

  return (
    <ul className="divide-y divide-border-light rounded-md border border-border-light bg-canvas">
      {invitations.map((invite) => (
        <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-soft-stone">
            <Mail className="h-4 w-4 text-body-muted" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">{invite.email}</p>
            <p className="truncate text-xs text-body-muted">{t(`roles.${invite.role}`)}</p>
          </div>
          <Badge variant="outline">{t("invitations")}</Badge>
          {canManage ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleCancel(invite.id)}
              className="text-error hover:text-error"
            >
              {t("revoke")}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
