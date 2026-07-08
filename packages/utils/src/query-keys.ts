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
  entities: {
    list: (branchId: string, type: string) =>
      ["entities", branchId, type] as const,
    detail: (entityId: string) => ["entities", entityId] as const,
  },
  findings: {
    list: (projectId: string, branchId: string) =>
      ["findings", projectId, branchId] as const,
  },
} as const;
