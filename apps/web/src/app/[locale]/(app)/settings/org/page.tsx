import { requireAuth } from "@lore/auth/guard";
import { auth } from "@lore/auth";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Topbar } from "../../_components/topbar";
import { MembersList } from "./_components/members-list";
import { InviteForm } from "./_components/invite-form";
import type { OrgRole } from "@lore/db";

export default async function OrgSettingsPage() {
  const session = await requireAuth();
  const h = await headers();
  const t = await getTranslations("Settings.org");

  const fullOrg = await auth.api.getFullOrganization({
    headers: h,
    query: { organizationId: session.session.activeOrganizationId ?? "" },
  });

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
  const orgId = session.session.activeOrganizationId ?? "";

  return (
    <>
      <Topbar title={fullOrg?.name ?? t("title")} />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#616161]">{t("members")}</h2>
          {currentRole === "owner" && <InviteForm orgId={orgId} />}
        </div>
        <MembersList
          orgId={orgId}
          members={members}
          currentUserId={session.user.id}
          currentUserRole={currentRole}
        />
      </div>
    </>
  );
}
