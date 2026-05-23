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
import { createId } from "@paralleldrive/cuid2";

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
    user: {
      create: {
        after: async (user) => {
          const orgId = createId();
          const memberId = createId();
          const slug = `personal-${user.id}`;

          await db.insert(organizations).values({
            id: orgId,
            name: user.name ?? user.email.split("@")[0] ?? "My Organization",
            slug,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(members).values({
            id: memberId,
            organizationId: orgId,
            userId: user.id,
            role: "owner",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
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
