// types/auth.ts
export type RoleCode = "ADMIN" | "TEACHER" | "TA" | "STUDENT" | "HR";


export interface JwtAuthenticationResponse {
  accessToken: string;
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
  permissions: string[];
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: RoleCode[];
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: number;
}

export interface ForgotPasswordRequest {
  usernameOrEmail: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  usernameOrEmail: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailChangeRequest {
  otp: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface CompleteInviteRequest {

  token: string;
  password: string;
}

export interface SetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}