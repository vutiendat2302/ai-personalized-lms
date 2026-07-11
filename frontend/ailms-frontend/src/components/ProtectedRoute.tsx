import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { RoleCode } from "@/types/jwtAuthentication";

/* ============================================================
 * PROTECTED ROUTE
 * ============================================================
 * Component dùng để bảo vệ các Route yêu cầu xác thực.
 *
 * Chức năng:
 *  1. Kiểm tra người dùng đã đăng nhập hay chưa.
 *  2. Kiểm tra người dùng có đúng quyền (Role) hay không.
 *  3. Nếu hợp lệ -> Render Route con.
 *  4. Nếu không hợp lệ -> Chuyển hướng sang Login hoặc Unauthorized.
 *
 * Ví dụ:
 *
 * <Route element={<ProtectedRoute />}>
 *    <Route path="/profile" element={<ProfilePage />} />
 * </Route>
 *
 * <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
 *    <Route path="/users" element={<UserManagementPage />} />
 * </Route>
 * ============================================================ */

// /* Props truyền vào ProtectedRoute */
interface ProtectedRouteProps {
  allowedRoles?: (RoleCode | string)[];
  allowedPermission?: string[];
  allowPerimmision?: string[]; // Alias to handle potential typo in guidelines
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles, allowedPermission,
}) => {

  // Lấy trạng thái xác thực của người dùng từ AuthContext
  const { auth } = useAuth();


  /* ==========================================================
   * KIỂM TRA ĐĂNG NHẬP
   * ==========================================================
   *
   * Nếu chưa có Access Token
   * => Người dùng chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.
   *
   * Chuyển hướng về trang Login.
   *
   * replace:thay thế trang hiện tại trong lịch sử trình duyệt, 
   * thay vì thêm một trang mới.
   * Không lưu Route hiện tại vào History để tránh người dùng
   * quay lại trang bị chặn bằng nút Back của trình duyệt.
   * ========================================================== */
  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/" replace />;
  }

  const user = auth.user;

  /* ==========================================================
   * KIỂM TRA PHÂN QUYỀN (RBAC)
   * ==========================================================
   *
   * Chỉ kiểm tra khi Route yêu cầu Role.
   *
   * Nếu Role của người dùng không nằm trong danh sách
   * allowedRoles thì chuyển tới trang Unauthorized.
   * ========================================================== */
  // Kiểm tra role
  if (
    allowedRoles?.length &&
    !user.roles.some(role =>
      allowedRoles.includes(role)
    )
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Kiểm tra permission
  if (
    allowedPermission?.length &&
    !allowedPermission.every(permission =>
      auth.user?.permissions.includes(permission)
    )
  ) {
    return <Navigate to="/unauthorized" replace />;
  }


  /* ==========================================================
   * NGƯỜI DÙNG HỢP LỆ
   * ==========================================================
   *
   * Đã đăng nhập và có đủ quyền.
   *
   * Outlet sẽ render Component của Route con.
   * ========================================================== */
  return <Outlet />;
};