"use client";
import { use, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@lore/utils";

export default function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    authClient.organization
      .acceptInvitation({ invitationId: id })
      .then((result: { error?: unknown }) => {
        if (result.error) {
          router.push(ROUTES.signIn);
        } else {
          router.push(ROUTES.dashboard);
        }
      });
  }, [id, router]);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-[#93939f]">Accepting invitation...</p>
    </div>
  );
}
