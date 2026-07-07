// hooks/usePermission.ts
import { useAuth } from "./useAuth";

export const usePermission = () => {
  const { auth } = useAuth();
  const can = (perm: string) => auth.user?.permissions.includes(perm) ?? false;
  const hasRole = (...roles: string[]) => roles.includes(auth.user?.role ?? "");
  return { can, hasRole };
};
