import { RolePermission } from "@/lib/domains/role.domain";

export const hasPermission = (
  userPermissions: RolePermission[],
  requiredPermission: RolePermission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasWritePermission = (
  userPermissions: RolePermission[]
): boolean => {
  return (
    hasPermission(userPermissions, RolePermission.WRITE) ||
    hasPermission(userPermissions, RolePermission.ADMIN)
  );
};

export const hasAdminPermission = (
  userPermissions: RolePermission[]
): boolean => {
  return hasPermission(userPermissions, RolePermission.ADMIN);
};
