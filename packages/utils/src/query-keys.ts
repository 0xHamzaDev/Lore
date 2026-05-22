export const QK = {
  org: {
    members: (orgId: string) => ["org", orgId, "members"] as const,
    invitations: (orgId: string) => ["org", orgId, "invitations"] as const,
  },
  session: ["session"] as const,
  projects: {
    list: (orgId: string) => ["projects", orgId] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
  },
} as const;
