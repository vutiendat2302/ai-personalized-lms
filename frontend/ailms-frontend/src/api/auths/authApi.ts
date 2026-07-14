// api/auth/authApi.ts
import httpClient from "@/api/httpClient";
import type {
    JwtAuthenticationResponse,
    LoginRequest,
    RegisterRequest,
    VerifyOtpRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    CompleteInviteRequest,
    SetPasswordRequest,
} from "@/types/jwtAuthentication";

import type { ApiResponse } from "@/types/base";

export const authApi = {
    login: (payload: LoginRequest) =>
        httpClient.post<ApiResponse<JwtAuthenticationResponse>>("/auth/login", payload),

    refresh: () =>
        httpClient.post<ApiResponse<JwtAuthenticationResponse>>("/auth/refresh"),

    register: (payload: RegisterRequest) =>
        httpClient.post<ApiResponse<null>>("/auth/register", payload),

    verifyOtp: (payload: VerifyOtpRequest) =>
        httpClient.post<ApiResponse<null>>("/auth/verify-otp", payload),

    resendOtp: (email: string) =>
        httpClient.post<ApiResponse<null>>("/auth/resend-otp", { email }),

    changePassword: (payload: ChangePasswordRequest) =>
        httpClient.post<ApiResponse<null>>("/auth/change-password", payload),

    forgotPassword: (payload: ForgotPasswordRequest) =>
        httpClient.post<ApiResponse<null>>("/auth/forgot-password", payload),

    resendForgotPasswordOtp: (usernameOrEmail: string) =>
        httpClient.post<ApiResponse<null>>("/auth/resend-forgot-password-otp", { usernameOrEmail }),

    resetPassword: (payload: ResetPasswordRequest) =>
        httpClient.post<ApiResponse<null>>("/auth/reset-password", payload),

    completeInvite: (payload: CompleteInviteRequest) => httpClient.post<ApiResponse<null>>("/auth/complete-invite", payload),
    
    setPassword: (payload: SetPasswordRequest) => httpClient.post<ApiResponse<null>>("/auth/set-password", payload),

    logout: () => httpClient.post<ApiResponse<null>>("/auth/logout"),
};