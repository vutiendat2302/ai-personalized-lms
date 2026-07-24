import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface DegreeResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  universityName: string;
  universityLogo: string;
  title: string;
  type: string; // BACHELORS, MASTERS
  duration: string;
  image: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const degreeApi = {
  searchDegrees: (params?: {
    categoryId?: string;
    type?: string;
    page?: number;
    size?: number;
    status?: string;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/degrees/search", { params }),

  getDegreesByCategory: (categoryId: string) =>
    httpClient.get<ApiResponse<DegreeResponse[]>>(`/v1/degrees/${categoryId}/category`),
};
