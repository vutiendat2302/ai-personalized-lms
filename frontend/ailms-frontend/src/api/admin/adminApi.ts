import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface AdminDashboardStats {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalCourses: number;
  totalCategories: number;
  totalOrders: number;
  registrationTrends: { month: string; value: number }[];
  categoryDistribution: { name: string; value: number; color: string }[];
}

export const adminApi = {
  getDashboardStats: () =>
    httpClient.get<ApiResponse<AdminDashboardStats>>("/v1/admin/dashboard/stats"),
};
