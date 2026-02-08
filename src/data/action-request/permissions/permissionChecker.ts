import { Permission } from "../types/Permission";
import { UserContext } from "../types/UserContext";

export function hasPermission(
  user: UserContext,
  permission?: Permission
): boolean {
  if (!permission) return true;

  if (permission.roles) {
    if (!permission.roles.some(r => user.roles.includes(r))) {
      return false;
    }
  }

  if (permission.apps) {
    if (!permission.apps.every(a => user.apps.includes(a))) {
      return false;
    }
  }

  return true;
}
