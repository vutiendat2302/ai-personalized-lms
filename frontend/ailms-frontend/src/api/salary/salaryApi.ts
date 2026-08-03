import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { PageResponse } from "@/api/departments/departmentApi";
import type {
  SalaryResponse,
  SalarySummaryResponse,
  SalarySearchFilters,
  GenerateSalaryPeriodPayload,
  PayrollBatchResponse,
} from "@/types/salaryManagement";

export const salaryApi = {
  getPayrollBatches: (params: { periodFrom: string; periodTo: string }) =>
    httpClient.get<ApiResponse<PayrollBatchResponse[]>>("/v1/salaries/payroll-batches", { params }).then(res => res.data.data),

  submitPayroll: (period: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/submit`).then(res => res.data.data),

  cancelPayrollSubmission: (period: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/cancel-submission`).then(res => res.data.data),

  approvePayroll: (period: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/approve`).then(res => res.data.data),

  rejectPayroll: (period: string, reason: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/reject`, { reason }).then(res => res.data.data),

  resubmitPayroll: (period: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/resubmit`).then(res => res.data.data),

  deleteDraftPayroll: (period: string) =>
    httpClient.delete<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/draft`).then(res => res.data.data),

  deleteApprovedPayroll: (period: string) =>
    httpClient.delete<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/approved`).then(res => res.data.data),

  getTrash: () => httpClient.get<ApiResponse<SalaryResponse[]>>("/v1/salaries/payroll-trash").then(res => res.data.data),
  restorePayroll: (period: string) => httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-trash/${period}/restore`).then(res => res.data.data),
  hardDeletePayroll: (period: string) => httpClient.delete<ApiResponse<number>>(`/v1/salaries/payroll-trash/${period}/hard`).then(res => res.data.data),

  exportTransferList: (period: string) =>
    httpClient.post(`/v1/salaries/payroll-batches/${period}/export-transfer`, undefined, { responseType: "blob" }).then(res => res.data),

  markPayrollPaid: (period: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/salaries/payroll-batches/${period}/mark-paid`).then(res => res.data.data),

  getSummary: (params?: { period?: string }) =>
    httpClient
      .get<ApiResponse<SalarySummaryResponse>>("/v1/salaries/summary", { params })
      .then((res) => res.data.data),

  getSummaryRange: (params: { periodFrom: string; periodTo: string }) =>
    httpClient.get<ApiResponse<SalarySummaryResponse>>("/v1/salaries/summary-range", { params }).then((res) => res.data.data),

  getSalaries: (params?: SalarySearchFilters) => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.keyword?.trim()) cleanParams.keyword = params.keyword.trim();
      if (params.period) cleanParams.period = params.period;
      if (params.periodFrom) cleanParams.periodFrom = params.periodFrom;
      if (params.periodTo) cleanParams.periodTo = params.periodTo;
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

  update: (id: string, payload: { mealAllowance?: number; phoneAllowance?: number; uniformAllowance?: number; responsibilityAllowance?: number; performanceAllowance?: number; insuranceSalary?: number; dependents?: number; bonus?: number; deduction?: number; description?: string }) =>
    httpClient.put<ApiResponse<SalaryResponse>>(`/v1/salaries/${id}`, payload).then((res) => res.data.data),

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

  exportCsvRange: (params: { periodFrom: string; periodTo: string; departmentId?: string; status?: string }) =>
    httpClient.get("/v1/salaries/export-range", { params, responseType: "blob" }).then((res) => res.data),
};
