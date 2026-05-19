import { ROUTES } from "@lore/utils";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "Nav.dashboard", href: ROUTES.dashboard, icon: "layout-grid" },
  { labelKey: "Nav.org", href: ROUTES.settings.org, icon: "users" },
];
