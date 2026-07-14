// services/auth.service.ts
import { authApi } from '@/api/auths/authApi';
import { setAccessToken } from "@/api/httpClient";
import type { 
  LoginRequest, 
  JwtAuthenticationResponse, 
  RegisterRequest, 
  VerifyOtpRequest, 
  ChangePasswordRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest, 
  CompleteInviteRequest,
  SetPasswordRequest
} from "@/types/jwtAuthentication";

/* ============================================================
 * AUTH SERVICE
 * ============================================================
 * Lớp trung gian giữa UI và Auth API.
 *
 * Chịu trách nhiệm:
 *  - Đăng nhập.
 *  - Đăng xuất.
 *  - Khôi phục phiên đăng nhập khi F5.
 *
 * Các Component chỉ gọi authService thay vì gọi authApi trực tiếp.
 * ============================================================ */
export const authService = {
  /* ==========================================================
   * ĐĂNG NHẬP
   * ==========================================================
   *
   * Gọi API Login.
   *
   * Backend trả về:
   *  - Access Token
   *  - Refresh Token (HttpOnly Cookie)
   *
   * Frontend:
   *  - Lưu Access Token vào Memory.
   *  - Trả User Information cho Component.
   * ========================================================== */
  async login(payload: LoginRequest): Promise<JwtAuthenticationResponse> {
    const { data } = await authApi.login(payload);
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  /* ==========================================================
   * ĐĂNG XUẤT
   * ==========================================================
   *
   * Gọi Backend xóa Refresh Token Cookie.
   *
   * Dù API thành công hay thất bại,
   * Frontend vẫn xóa Access Token khỏi Memory.
   * ========================================================== */
  async logout() {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
    }
  },

  // Gọi lúc app khởi động (F5) để lấy lại access token nếu cookie còn hạn
  async tryRestoreSession(): Promise<JwtAuthenticationResponse | null> {
    try {
      const { data } = await authApi.refresh();
      setAccessToken(data.data.accessToken);
      return data.data;
    } catch {
      return null;
    }
  },

  async register(payload: RegisterRequest): Promise<void> {
    await authApi.register(payload);
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<void> {
    await authApi.verifyOtp(payload);
  },

  async resendOtp(email: string): Promise<void> {
    await authApi.resendOtp(email);
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await authApi.changePassword(payload);
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    await authApi.forgotPassword(payload);
  },

  async resendForgotPasswordOtp(usernameOrEmail: string): Promise<void> {
    await authApi.resendForgotPasswordOtp(usernameOrEmail);
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await authApi.resetPassword(payload);
  },

  async completeInvite(payload: CompleteInviteRequest): Promise<void> {
    await authApi.completeInvite(payload);
  },

  async setPassword(payload: SetPasswordRequest): Promise<void> {
    await authApi.setPassword(payload);
  }, 
};