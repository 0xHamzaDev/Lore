export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  privacy: "/privacy",
  terms: "/terms",
  acceptInvitation: (id: string) => `/accept-invitation/${id}`,
  dashboard: "/dashboard",
  settings: {
    org: "/settings/org",
    profile: "/settings/profile",
    billing: "/settings/billing",
  },
  projects: {
    list: "/dashboard",
    canvas: (projectId: string) => `/projects/${projectId}/canvas`,
  },
} as const;
