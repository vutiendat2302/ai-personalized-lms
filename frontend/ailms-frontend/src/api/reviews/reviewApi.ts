import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export const reviewApi = {
  searchReviews: (params?: {
    courseId?: string;
    rating?: number;
    status?: string;
    sort?: string[] | string;
    page?: number;
    size?: number;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/reviews/search", { params }),

  getAverageRating: () =>
    httpClient.get<ApiResponse<number>>("/v1/reviews/average-rating"),

  moderate: (id: string, approve: boolean, rejectionReason?: string) =>
    httpClient.post<ApiResponse<any>>(`/v1/reviews/reviews/${id}/approve`, null, {
      params: { approve, rejectionReason },
    }),
};
