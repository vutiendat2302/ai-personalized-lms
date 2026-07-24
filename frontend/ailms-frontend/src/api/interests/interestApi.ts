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
  status?: string;
}

export const interestApi = {
  getInterests: () =>
    httpClient.get<ApiResponse<InterestResponse[]>>("/v1/interests"),
};
