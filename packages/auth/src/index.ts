import {
  db,
  organizations,
  members,
  users,
  sessions,
  accounts,
  verifications,
  invitations,
} from "@lore/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { ensurePersonalOrg } from "./org";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      membershipRoles: ["owner", "editor", "viewer"],
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
      sendInvitationEmail: async (data) => {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env["RESEND_API_KEY"]);
        const baseUrl = process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000";
        const acceptUrl = `${baseUrl}/accept-invitation/${data.id}`;

        await resend.emails.send({
          from: "Lore <noreply@lore.app>",
          to: data.email,
          subject: `Invitation to join ${data.organization.name} on Lore`,
          html: `
            <p>You've been invited to join <strong>${data.organization.name}</strong> on Lore.</p>
            <p><a href="${acceptUrl}">Accept invitation</a></p>
            <p>This link expires in 7 days.</p>
          `,
        });
      },
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        // Ensure the user has a personal org and point the new session at it.
        // Every AI route and requirePro reads session.activeOrganizationId and
        // 400s ("no_active_org") when it's null, so it MUST be set on the very
        // first session. Org creation lives here (not in user.create.after)
        // because that hook runs after the session is created on sign-up, so a
        // freshly signed-up user's first session had no org and no AI access.
        // Runs on sign-up (creates the org) and every sign-in (org exists).
        before: async (session) => {
          const organizationId = await ensurePersonalOrg(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: organizationId,
            },
          };
        },
      },
    },
  },
  trustedOrigins: [
    process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    // Accept any localhost port in development so Next.js auto-port-bumping (3000→3001→3002) still works.
    ...(process.env["NODE_ENV"] !== "production"
      ? ["http://localhost:3001", "http://localhost:3002", "http://localhost:3003"]
      : []),
  ],
});

export type Auth = typeof auth;
