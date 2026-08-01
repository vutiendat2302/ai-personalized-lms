import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { PageResponse } from "@/api/departments/departmentApi";
import type {
  SalaryResponse,
  SalarySummaryResponse,
  SalarySearchFilters,
  GenerateSalaryPeriodPayload,
} from "@/types/salaryManagement";

export const salaryApi = {
  getSummary: (params?: { period?: string }) =>
    httpClient
      .get<ApiResponse<SalarySummaryResponse>>("/v1/salaries/summary", { params })
      .then((res) => res.data.data),

  getSalaries: (params?: SalarySearchFilters) => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.keyword?.trim()) cleanParams.keyword = params.keyword.trim();
      if (params.period) cleanParams.period = params.period;
      if (params.status && params.status !== "ALL") cleanParams.status = params.status;
      if (params.departmentId && params.departmentId !== "ALL") cleanParams.departmentId = params.departmentId;
      if (params.salaryTypeEnum && params.salaryTypeEnum !== "ALL") cleanParams.salaryTypeEnum = params.salaryTypeEnum;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;
      if (params.sortDir) cleanParams.sortDir = params.sortDir;
    }
    return httpClient
      .get<ApiResponse<PageResponse<SalaryResponse>>>("/v1/salaries", { params: cleanParams })
      .then((res) => res.data.data);
  },

  getById: (id: string) =>
    httpClient.get<ApiResponse<SalaryResponse>>(`/v1/salaries/${id}`).then((res) => res.data.data),

  generatePeriod: (payload: GenerateSalaryPeriodPayload) =>
    httpClient.post<ApiResponse<number>>("/v1/salaries/generate-period", payload).then((res) => res.data.data),

  approve: (id: string) =>
    httpClient.patch<ApiResponse<SalaryResponse>>(`/v1/salaries/${id}/approve`).then((res) => res.data.data),

  bulkApprove: (ids: string[]) =>
    httpClient.post<ApiResponse<void>>("/v1/salaries/bulk-approve", ids).then((res) => res.data),

  markPaid: (id: string) =>
    httpClient.patch<ApiResponse<SalaryResponse>>(`/v1/salaries/${id}/mark-paid`).then((res) => res.data.data),

  bulkMarkPaid: (ids: string[]) =>
    httpClient.post<ApiResponse<void>>("/v1/salaries/bulk-mark-paid", ids).then((res) => res.data),

  exportCsv: (params?: { period?: string; departmentId?: string; status?: string }) => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.period) cleanParams.period = params.period;
      if (params.departmentId && params.departmentId !== "ALL") cleanParams.departmentId = params.departmentId;
      if (params.status && params.status !== "ALL") cleanParams.status = params.status;
    }
    return httpClient
      .get("/v1/salaries/export", {
        params: cleanParams,
        responseType: "blob",
      })
      .then((res) => res.data);
  },
};
