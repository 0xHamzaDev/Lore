import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Section } from "@lore/ui";
import { requireAuth } from "@lore/auth/guard";
import { auth } from "@lore/auth";
import { and, db, eq, invitations, members as membersTable } from "@lore/db";
import type { OrgRole } from "@lore/db";
import { MembersList } from "./_components/members-list";
import { InviteForm } from "./_components/invite-form";
import { InvitationsList } from "./_components/invitations-list";
import { OrgGeneralForm } from "./_components/org-general-form";

export default async function OrgSettingsPage() {
  const session = await requireAuth();
  const h = await headers();
  const t = await getTranslations("Settings.org");

  let orgId = session.session.activeOrganizationId ?? "";
  if (!orgId) {
    const membership = await db
      .select({ organizationId: membersTable.organizationId })
      .from(membersTable)
      .where(eq(membersTable.userId, session.user.id))
      .limit(1);
    orgId = membership[0]?.organizationId ?? "";
  }

  const fullOrg = orgId
    ? await auth.api.getFullOrganization({
        headers: h,
        query: { organizationId: orgId },
      })
    : null;

  const members = (fullOrg?.members ?? []).map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role as OrgRole,
    user: {
      name: m.user?.name ?? "",
      email: m.user?.email ?? "",
      image: m.user?.image ?? null,
    },
  }));

  const currentMember = members.find((m) => m.userId === session.user.id);
  const currentRole: OrgRole = (currentMember?.role ?? "viewer") as OrgRole;
  const isOwner = currentRole === "owner";

  const pendingInvites = orgId
    ? await db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          expiresAt: invitations.expiresAt,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.organizationId, orgId),
            eq(invitations.status, "pending"),
          ),
        )
    : [];

  return (
    <>
      <Section
        title={t("general")}
        description={t("generalDescription")}
        bordered
      >
        <OrgGeneralForm
          orgId={orgId}
          orgName={fullOrg?.name ?? ""}
          orgSlug={fullOrg?.slug ?? null}
          createdAt={fullOrg?.createdAt ?? null}
          canEdit={isOwner}
        />
      </Section>

      <Section
        title={t("members")}
        description={t("membersDescription")}
        action={isOwner ? <InviteForm orgId={orgId} /> : null}
      >
        <MembersList
          orgId={orgId}
          members={members}
          currentUserId={session.user.id}
          currentUserRole={currentRole}
        />
      </Section>

      <Section
        title={t("invitations")}
        description={t("invitationsDescription")}
      >
        <InvitationsList
          orgId={orgId}
          invitations={pendingInvites.map((i) => ({
            id: i.id,
            email: i.email,
            role: (i.role ?? "viewer") as OrgRole,
            expiresAt: i.expiresAt,
          }))}
          canManage={isOwner}
        />
      </Section>
    </>
  );
}
