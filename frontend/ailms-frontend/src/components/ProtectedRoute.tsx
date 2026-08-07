import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { RoleCode } from "@/types/jwtAuthentication";
import { getAvailablePortals, type PortalType } from "@/utils/workspaceUtils";

/* ============================================================
 * PROTECTED ROUTE (PORTAL PROTECTED ROUTE)
 * ============================================================
 * Component dùng để bảo vệ các Route yêu cầu xác thực và phân vùng Portal.
 * ============================================================ */

interface ProtectedRouteProps {
  allowedRoles?: (RoleCode | string)[];
  allowedPermission?: string[];
  requiredPortal?: PortalType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  allowedPermission,
  requiredPortal
}) => {
  const { auth, activeWorkspace, availablePortals } = useAuth();
  const location = useLocation();

  // 1. CHƯA ĐĂNG NHẬP: Lưu returnUrl và đưa về trang chủ / login
  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/" state={{ from: location.pathname + location.search }} replace />;
  }

  const user = auth.user;
  const userPortals = availablePortals.length > 0 ? availablePortals : getAvailablePortals(user.roles);

  // 2. TÀI KHOẢN KHÔNG CÓ PORTAL NÀO HỢP LỆ (0 Portal edge-case)
  if (userPortals.length === 0) {
    return <Navigate to="/no-workspace" replace />;
  }

  // 3. KIỂM TRA QUYỀN PORTAL YÊU CẦU
  if (requiredPortal) {
    const hasPortalAccess = userPortals.includes(requiredPortal);
    if (!hasPortalAccess) {
      // User cố truy cập Portal không được cấp quyền -> Đưa về trang chọn workspace
      if (userPortals.length > 1) {
        return <Navigate to="/select-workspace" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  // 4. KIỂM TRA PHÂN QUYỀN ROLES CỤ THỂ
  if (
    allowedRoles?.length &&
    !user.roles.some((role) =>
      allowedRoles.some(
        (allowed) => allowed.toUpperCase() === String(role).replace("ROLE_", "").toUpperCase()
      )
    )
  ) {
    return <Navigate to="/" replace />;
  }

  // 5. KIỂM TRA PERMISSION CỤ THỂ
  if (
    allowedPermission?.length &&
    !allowedPermission.every((permission) => user.permissions?.includes(permission))
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};