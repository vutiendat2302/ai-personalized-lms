import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export const reviewApi = {
  searchReviews: (params?: {
    keyword?: string;
    courseId?: string | number;
    rating?: number;
    status?: string;
    createdFrom?: string;
    createdTo?: string;
    sort?: string[] | string;
    page?: number;
    size?: number;
  }) =>
    httpClient.get<ApiResponse<any>>("/v1/reviews/search", { params }),

  getAverageRating: () =>
    httpClient.get<ApiResponse<number>>("/v1/reviews/average-rating"),

  moderate: (id: string | number, approve: boolean, rejectionReason?: string) =>
    httpClient.post<ApiResponse<any>>(`/v1/reviews/reviews/${id}/approve`, null, {
      params: { approve, rejectionReason },
    }),

  deleteReview: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/reviews/reviews/${id}`),
};

