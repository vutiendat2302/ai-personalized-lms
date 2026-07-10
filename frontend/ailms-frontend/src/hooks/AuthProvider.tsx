import React, { useState, useEffect } from "react";
import { AuthContext } from "./useAuth";
import type { AuthUser, RoleCode, LoginRequest } from "@/types/jwtAuthentication";
import { authService } from "@/services/authService";
import { setAccessToken, clearAuth } from "@/api/httpClient";

interface AuthProviderProps {
  children: React.ReactNode;
}

// Khởi tạo Auth Context Provider để quản lý trạng thái xác thực toàn ứng dụng
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Thông tin người dùng hiện tại
  const [user, setUser] = useState<AuthUser | null>(null);
  // Access Token được lưu trong state 
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
   // Trạng thái kiểm tra phiên đăng nhập ban đầu
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
         // Thử khôi phục phiên đăng nhập bằng refresh token trong cookie
        const res = await authService.tryRestoreSession();
        if (res && res.accessToken) {
          setAccessToken(res.accessToken);
          setAccessTokenState(res.accessToken);

          const getAllRoles = (roles : string[]): RoleCode[] => {
            if (!roles || roles.length === 0) return ["STUDENT"];

            return roles.map(role => role.replace("ROLE_", "").toUpperCase() as RoleCode);
          };

          const roleList = getAllRoles(res.roles);

          setUser({
            id: String(res.id),
            username: res.username || "",
            email: res.email || "",
            roles: roleList,
            permissions: res.permissions || []
          });
        }
      } catch (error) {
        console.log("No valid session found on startup");
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const data: LoginRequest = { usernameOrEmail, password};
    const res = await authService.login(data);

    if (res.accessToken) {
      setAccessToken(res.accessToken);
      setAccessTokenState(res.accessToken);

        const getAllRoles = (roles : string[]): RoleCode[] => {
          if (!roles || roles.length === 0) return ["STUDENT"];

          return roles.map(role => role.replace("ROLE_", "").toUpperCase() as RoleCode);
        };

        const roleList = getAllRoles(res.roles);

        setUser({
          id: String(res.id),
          username: res.username || "",
          email: res.email || "",
          roles: roleList,
          permissions: res.permissions || []
        });
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error("Logout failed on server:", e);
    } finally {
      clearAuth();
      setUser(null);
      setAccessTokenState(null);
    }
  };

  // Hiển thị loading trong lúc kiểm tra phiên đăng nhập
  if (loading) {
    return <div>Loading Auth...</div>;
  }

  // Cung cấp Auth Context cho toàn bộ ứng dụng
  return (
    <AuthContext.Provider value={{ auth: { user, accessToken }, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
