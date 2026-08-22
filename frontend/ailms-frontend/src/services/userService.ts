import httpClient from "@/api/httpClient";
import type { UserEntity } from "@/types/user";
import type { ApiResponse } from "@/types/base";

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  gender?: number;
  dateOfBirth?: string;
  avatarUrl?: string;
  attributes?: string; // Contains extra academic & guardian info as JSON
}

export interface ProfileGuardianRequest {
  id?: string;
  fullName: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateRoleProfileRequest {
  educationLevel?: string;
  schoolName?: string;
  goal?: string;
  description?: string;
  isMinor?: boolean;
  guardians?: ProfileGuardianRequest[];
  departmentId?: string | number;
  position?: string;
  employmentTypeEnum?: "FULL_TIME" | "PART_TIME";
  startDate?: string;
  address?: string;
}

/** Trích xuất message lỗi từ response của axios hoặc BE */
const extractErrorMessage = (e: unknown): string => {
  if (e && typeof e === "object") {
    const err = e as any;
    // BE thường trả về { message: "..." } hoặc { error: "..." }
    const beMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.errors?.[0]?.message;
    if (beMsg) return beMsg;
    if (err?.message) return err.message;
  }
  return "Có lỗi xảy ra, vui lòng thử lại.";
};

export const userService = {
  getProfile: async (): Promise<UserEntity> => {
    try {
      const { data } = await httpClient.get<ApiResponse<UserEntity>>("/v1/users/profile");
      // Cache lại để dùng lần sau khi offline tạm thời
      localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
      return data.data;
    } catch (e) {
      // Nếu là lỗi mạng tạm thời và có cache → trả cache
      const cache = localStorage.getItem("user_profile_cache");
      if (cache) {
        try { return JSON.parse(cache); } catch { /* skip */ }
      }
      // Không có cache → rethrow để UI báo lỗi thật
      throw new Error(extractErrorMessage(e));
    }
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<UserEntity> => {
    // Không catch — để lỗi nổi lên cho UI xử lý và hiển thị đúng thông báo
    const { data } = await httpClient.put<ApiResponse<UserEntity>>("/v1/users/profile", payload);
    // Cập nhật cache sau khi lưu thành công
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },

  updateBasicProfile: async (payload: UpdateProfileRequest): Promise<UserEntity> => {
    const { data } = await httpClient.put<ApiResponse<UserEntity>>("/v1/users/profile/basic", payload);
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },

  updateRoleProfile: async (payload: UpdateRoleProfileRequest): Promise<UserEntity> => {
    const { data } = await httpClient.put<ApiResponse<UserEntity>>("/v1/users/profile/role", payload);
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },

  updateEmployeeAddress: async (address: string): Promise<UserEntity> => {
    const { data } = await httpClient.patch<ApiResponse<UserEntity>>("/v1/users/profile/employee/address", { address });
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },

  uploadAvatar: async (file: File): Promise<UserEntity> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await httpClient.post<ApiResponse<UserEntity>>("/v1/users/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },

  deleteAvatar: async (): Promise<UserEntity> => {
    const { data } = await httpClient.delete<ApiResponse<UserEntity>>("/v1/users/profile/avatar");
    localStorage.setItem("user_profile_cache", JSON.stringify(data.data));
    return data.data;
  },
};
