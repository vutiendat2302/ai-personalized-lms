// hooks/useAuth.ts (dùng context) 
import { createContext, useContext } from "react";
import type { AuthState } from "@/types/jwtAuthentication";

// Context lưu trạng thái xác thực và các hàm đăng nhập/đăng xuất
export const AuthContext = createContext<{
  auth: AuthState;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  logout: () => void;
} | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};