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
};
