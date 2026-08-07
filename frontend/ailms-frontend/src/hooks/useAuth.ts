import { createContext, useContext } from "react";
import type { AuthState } from "@/types/jwtAuthentication";
import type { PortalType } from "@/utils/workspaceUtils";

export interface AuthContextType {
  auth: AuthState;
  activeWorkspace: PortalType | null;
  defaultWorkspace: PortalType | null;
  availablePortals: PortalType[];
  switchWorkspace: (portal: PortalType) => void;
  setDefaultWorkspace: (portal: PortalType | null) => void;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  logout: () => void;
}

// Context lưu trạng thái xác thực và các hàm đăng nhập/đăng xuất/chuyển đổi không gian làm việc
export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};