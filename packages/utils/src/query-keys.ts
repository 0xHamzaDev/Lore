export const QK = {
  org: {
    members: (orgId: string) => ["org", orgId, "members"] as const,
    invitations: (orgId: string) => ["org", orgId, "invitations"] as const,
  },
  session: ["session"] as const,
} as const;
