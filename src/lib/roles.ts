import { IRole, IUser } from "@/types";

export const ROLES = ["admin", "writer", "singer"] as const;

export const ROLE_LABELS: Record<IRole, string> = {
  admin: "Admin",
  writer: "Writer",
  singer: "Singer",
};

/** True if the user has any of the given roles. Admins pass every check. */
export const hasRole = (user: Pick<IUser, "roles">, ...roles: IRole[]) =>
  user.roles.includes("admin") || roles.some((r) => user.roles.includes(r));
