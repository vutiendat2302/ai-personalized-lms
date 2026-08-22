import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AuthContext } from "./useAuth";
import type { AuthUser, RoleCode, LoginRequest } from "@/types/jwtAuthentication";
import { authService } from "@/services/authService";
import { setAccessToken, clearAuth } from "@/api/httpClient";
import {
  getAvailablePortals,
  validateActiveWorkspace,
  type PortalType
} from "@/utils/workspaceUtils";

interface AuthProviderProps {
  children: React.ReactNode;
}

const ACTIVE_WS_KEY_PREFIX = "lms_active_ws_";
const DEFAULT_WS_KEY_PREFIX = "lms_default_ws_";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspaceState] = useState<PortalType | null>(null);
  const [defaultWorkspace, setDefaultWorkspaceState] = useState<PortalType | null>(null);

  // Tính toán danh sách portals hợp lệ của User hiện tại
  const availablePortals = useMemo<PortalType[]>(() => {
    return getAvailablePortals(user?.roles);
  }, [user?.roles]);

  // Sync / validate active & default workspace khi user thay đổi
  useEffect(() => {
    if (!user || availablePortals.length === 0) {
      setActiveWorkspaceState(null);
      setDefaultWorkspaceState(null);
      return;
    }

    const userId = user.id;
    const savedActiveWs = localStorage.getItem(`${ACTIVE_WS_KEY_PREFIX}${userId}`) as PortalType | null;
    const savedDefaultWs = localStorage.getItem(`${DEFAULT_WS_KEY_PREFIX}${userId}`) as PortalType | null;

    // Validate saved active workspace against actual current available portals (nếu chưa có active, ưu tiên lấy default)
    const targetWs = savedActiveWs || savedDefaultWs;
    const validWs = validateActiveWorkspace(targetWs, availablePortals);
    setActiveWorkspaceState(validWs);

    // Validate saved default workspace
    if (savedDefaultWs && availablePortals.includes(savedDefaultWs)) {
      setDefaultWorkspaceState(savedDefaultWs);
    } else {
      setDefaultWorkspaceState(null);
    }
  }, [user, availablePortals]);

  const switchWorkspace = useCallback((portal: PortalType) => {
    if (!user) return;
    if (!availablePortals.includes(portal)) {
      console.warn(`User ${user.id} does not have access to portal: ${portal}`);
      return;
    }
    setActiveWorkspaceState(portal);
    localStorage.setItem(`${ACTIVE_WS_KEY_PREFIX}${user.id}`, portal);
  }, [user, availablePortals]);

  const setDefaultWorkspace = useCallback((portal: PortalType | null) => {
    if (!user) return;
    if (portal && !availablePortals.includes(portal)) return;
    
    setDefaultWorkspaceState(portal);
    if (portal) {
      localStorage.setItem(`${DEFAULT_WS_KEY_PREFIX}${user.id}`, portal);
    } else {
      localStorage.removeItem(`${DEFAULT_WS_KEY_PREFIX}${user.id}`);
    }
  }, [user, availablePortals]);

  /** Đồng bộ tức thời hồ sơ đang đăng nhập cho header và mọi layout dùng AuthContext. */
  const updateCurrentUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => current ? { ...current, ...patch } : current);
  }, []);

  const helperProcessRoles = (roles?: string[]): RoleCode[] => {
    if (!roles || roles.length === 0) return ["STUDENT"];
    return roles.map(role => role.replace("ROLE_", "").toUpperCase() as RoleCode);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await authService.tryRestoreSession();
        if (res && res.accessToken) {
          setAccessToken(res.accessToken);
          setAccessTokenState(res.accessToken);

          const roleList = helperProcessRoles(res.roles);

          setUser({
            id: String(res.id),
            username: res.username || "",
            email: res.email || "",
            roles: roleList,
            permissions: res.permissions || [],
            fullName: res.fullName || res.username || "",
            avatarUrl: res.avatarUrl || null,
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
    const data: LoginRequest = { usernameOrEmail, password };
    const res = await authService.login(data);

    if (res.accessToken) {
      setAccessToken(res.accessToken);
      setAccessTokenState(res.accessToken);

      const roleList = helperProcessRoles(res.roles);
      const newUser: AuthUser = {
        id: String(res.id),
        username: res.username || "",
        email: res.email || "",
        roles: roleList,
        permissions: res.permissions || [],
        fullName: res.fullName || res.username || "",
        avatarUrl: res.avatarUrl || null,
      };

      setUser(newUser);

      // Cập nhật ngay active workspace dựa trên roles của user mới đăng nhập
      const portals = getAvailablePortals(roleList);
      const savedActiveWs = localStorage.getItem(`${ACTIVE_WS_KEY_PREFIX}${newUser.id}`) as PortalType | null;
      const savedDefaultWs = localStorage.getItem(`${DEFAULT_WS_KEY_PREFIX}${newUser.id}`) as PortalType | null;
      const validWs = validateActiveWorkspace(savedActiveWs || savedDefaultWs, portals);
      setActiveWorkspaceState(validWs);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error("Logout failed on server:", e);
    } finally {
      if (user) {
        localStorage.removeItem(`${ACTIVE_WS_KEY_PREFIX}${user.id}`);
        // Giữ lại default workspace nếu user muốn, hoặc có thể xóa nếu cần
      }
      clearAuth();
      setUser(null);
      setAccessTokenState(null);
      setActiveWorkspaceState(null);
      setDefaultWorkspaceState(null);
    }
  };

  // Màn hình Chờ kiểm tra quyền ban đầu (Chống race condition & flash UI)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Đang xác thực và chuẩn bị không gian làm việc...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        auth: { user, accessToken },
        activeWorkspace,
        defaultWorkspace,
        availablePortals,
        switchWorkspace,
        setDefaultWorkspace,
        login,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
