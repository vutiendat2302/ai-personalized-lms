import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface InterestResponse {
  id: string;
  code?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  categoryName?: string;
  status?: number;
}

export const interestApi = {
  /** Lấy danh sách sở thích cố định được cấu hình tại backend. */
  getInterests: () =>
    httpClient.get<ApiResponse<InterestResponse[]>>("/v1/interests"),
};
