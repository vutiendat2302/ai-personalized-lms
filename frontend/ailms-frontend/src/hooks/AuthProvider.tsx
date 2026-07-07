import React, { useState, useEffect } from "react";
import { AuthContext } from "./useAuth";
import type { AuthUser, RoleCode, LoginRequest } from "@/types/jwtAuthentication";
import { authService } from "@/services/authService";
import { setAccessToken, clearAuth } from "@/api/httpClient";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Since access token is in memory, we try to restore session on startup
        const res = await authService.tryRestoreSession();
        if (res && res.accessToken) {
          setAccessToken(res.accessToken);
          setAccessTokenState(res.accessToken);

          const roleStr = res.roles && res.roles.length > 0
            ? (res.roles[0].replace("ROLE_", "").toUpperCase() as RoleCode)
            : "STUDENT";

          setUser({
            id: String(res.id),
            email: res.email || res.username || "",
            role: roleStr,
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

  const login = async (usernameOrEmail: string, pass: string) => {
    const data: LoginRequest = { usernameOrEmail, password: pass };
    const res = await authService.login(data);

    if (res.accessToken) {
      setAccessToken(res.accessToken);
      setAccessTokenState(res.accessToken);

      const roleStr = res.roles && res.roles.length > 0
        ? (res.roles[0].replace("ROLE_", "").toUpperCase() as RoleCode)
        : "STUDENT";

      setUser({
        id: String(res.id),
        email: res.email || res.username || "",
        role: roleStr,
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

  if (loading) {
    return <div>Loading Auth...</div>;
  }

  return (
    <AuthContext.Provider value={{ auth: { user, accessToken }, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
