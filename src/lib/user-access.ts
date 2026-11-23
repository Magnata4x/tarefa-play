export type SystemRole = "user" | "advertiser" | "admin";

export const roleLabels: Record<SystemRole, string> = {
  user: "Validador",
  advertiser: "Anunciante",
  admin: "ADM",
};

export function canAccessArea(roles: readonly string[], area: SystemRole) {
  return roles.includes(area);
}

export function accountHome(roles: readonly string[]) {
  if (canAccessArea(roles, "admin")) return "/admin" as const;
  if (canAccessArea(roles, "advertiser")) return "/anunciante" as const;
  return "/dashboard" as const;
}