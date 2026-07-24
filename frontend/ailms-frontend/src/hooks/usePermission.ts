// hooks/usePermission.ts
import type { RoleCode } from "@/types/jwtAuthentication";
import { useAuth } from "./useAuth";

// Hook hỗ trợ kiểm tra quyền (permission) và vai trò (role)
// của người dùng hiện tại từ AuthContext
export const usePermission = () => {
  const { auth } = useAuth();
  // Kiểm tra user có permission được chỉ định hay không
  const can = (perm: string) => auth.user?.permissions.includes(perm) ?? false;

  // Kiểm tra user có thuộc một trong các role được truyền vào hay không
  const hasRole = (...roles: RoleCode[]) => auth.user?.roles.some(role => roles.includes(role)) ?? false;
  return { can, hasRole };
};
