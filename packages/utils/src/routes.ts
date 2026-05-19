export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
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
