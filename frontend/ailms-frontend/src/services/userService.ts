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

export const userService = {
  getProfile: async (): Promise<UserEntity> => {
    try {
      const { data } = await httpClient.get<ApiResponse<UserEntity>>("/v1/users/profile");
      return data.data;
    } catch (e) {
      // Fallback local storage for mock robustness
      const local = localStorage.getItem("user_profile");
      if (local) return JSON.parse(local);
      
      const defaultProfile: UserEntity = {
        id: "1",
        username: "huan_hoa_hong",
        email: "huanrose@ailms.edu.vn",
        fullName: "Bùi Xuân Huấn",
        phone: "0999999999",
        avatarUrl: null,
        gender: 0,
        dateOfBirth: "1994-08-12",
        attributes: JSON.stringify({
          guardianName: "Bùi Xuân Hải",
          guardianPhone: "0988888888",
          academicLevel: "Cao đẳng",
          schoolName: "Trường đời",
          gradeClass: "Lớp học đạo lý",
          learningGoals: "Nâng cao nhận thức xã hội và phát triển tư duy dịch vụ"
        }),
        status: "ACTIVE",
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem("user_profile", JSON.stringify(defaultProfile));
      return defaultProfile;
    }
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<UserEntity> => {
    try {
      const { data } = await httpClient.put<ApiResponse<UserEntity>>("/v1/users/profile", payload);
      // Synchronize with local storage
      localStorage.setItem("user_profile", JSON.stringify(data.data));
      return data.data;
    } catch (e) {
      // Fallback
      const current = await userService.getProfile();
      const updated = { 
        ...current, 
        fullName: payload.fullName !== undefined ? payload.fullName : current.fullName,
        phone: payload.phone !== undefined ? payload.phone : current.phone,
        gender: payload.gender !== undefined ? payload.gender : current.gender,
        dateOfBirth: payload.dateOfBirth !== undefined ? payload.dateOfBirth : current.dateOfBirth,
        avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : current.avatarUrl,
        attributes: payload.attributes !== undefined ? payload.attributes : current.attributes,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem("user_profile", JSON.stringify(updated));
      return updated;
    }
  }
};
