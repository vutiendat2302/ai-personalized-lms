import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type {
  EmployeeContractItem,
  AttendanceRecordItem,
  TeachingRateItem,
  TeachingSessionPaymentItem,
  SalaryPeriodItem,
  LeaveRequestItem,
  ApprovalRequestItem,
  EmployeeAuditLogItem,
} from "@/types/employee";


import type { PageResponse } from "@/types/admin";

export const employeeApi = {
  createEmployee: async (payload: Record<string, unknown>) => {
    const response = await httpClient.post<ApiResponse<any>>("/v1/employees", payload);
    return response.data;
  },
  onboardEmployee: async (payload: Record<string, unknown>, contractFile?: File) => {
    const formData = new FormData();
    formData.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    if (contractFile) formData.append("contractFile", contractFile);
    const response = await httpClient.post<ApiResponse<any>>("/v1/employees/onboard", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  syncMissingProfiles: async () => {
    return httpClient.post<ApiResponse<string>>("/v1/employees/sync-missing-profiles");
  },

  updateEmployee: async (id: string, data: {
    fullName?: string;
    phone?: string;
    gender?: number;
    dateOfBirth?: string;
    startDate?: string;
    endDate?: string;
    address?: string;
    position?: string;
    status?: string;
    employmentType?: string;
    employmentTypeEnum?: string;
    departmentId?: string;
  }) => {
    return httpClient.put<ApiResponse<any>>(`/v1/employees/${id}`, data);
  },

  // 5.11.1 Overview Chart APIs
  getEmploymentTypeStats: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-employment-type", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch employment type stats", e);
    }
    return {};
  },

  getDepartmentStats: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-department", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch department stats", e);
    }
    return {};
  },

  getContractStatusStats: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/contract-status", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch contract status stats", e);
    }
    return {};
  },

  getExpiringProbationCount: async () => {
    try {
      const res = await httpClient.get<ApiResponse<number>>("/v1/employees/stats/expiring-probation-contracts");
      if (res.data?.success && typeof res.data.data === "number") {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch expiring probation count", e);
    }
    return 0;
  },

  notifyExpiringProbation: async () => {
    try {
      const res = await httpClient.post<ApiResponse<void>>("/v1/employees/stats/notify-expiring-probation");
      return res.data;
    } catch (e) {
      return { success: false, message: "Không thể gửi thông báo tới HR" };
    }
  },

  getStaffRoleStats: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/roles", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch staff role stats", e);
    }
    return {};
  },

  // 5.11.2 Mini Chart Stats
  getFulltimeMonthlyAttendanceStats: async (month?: string) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/attendances/stats/monthly-status", { params: { month } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch monthly attendance stats", e);
    }
    return {};
  },

  getParttimeTeachingSessionStats: async (period?: string) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/teaching-session-payments/stats/status-summary", { params: { period } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch teaching session stats", e);
    }
    return {};
  },

  // 5.11.4 Employee Detail Sub-Tab & Contract Management APIs
  getContractsByEmployeeId: async (employeeId: string): Promise<EmployeeContractItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<EmployeeContractItem[]>>(`/v1/contracts/employee/${employeeId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Fallback to employee-contracts endpoint if any", e);
      try {
        const res2 = await httpClient.get<ApiResponse<EmployeeContractItem[]>>(`/v1/employee-contracts/employee/${employeeId}`);
        if (res2.data?.success && Array.isArray(res2.data.data)) {
          return res2.data.data;
        }
      } catch (err) {
        console.warn("Using fallback empty contract list", err);
      }
    }
    return [];
  },

  checkActiveContract: async (employeeId: string) => {
    const res = await httpClient.get<ApiResponse<{
      hasActiveContract: boolean;
      activeContractId?: string;
      activeContractType?: string;
      startDate?: string;
    }>>(`/v1/contracts/employee/${employeeId}/active-check`);
    return res.data;
  },

  createContract: async (payload: {
    employeeId: string;
    contractTypeEnum: string;
    startDate: string;
    endDate?: string;
    baseSalary: number;
    salaryTypeEnum: string;
    signedAt?: string;
  }) => {
    return httpClient.post<ApiResponse<EmployeeContractItem>>("/v1/contracts", payload);
  },

  uploadContractFile: async (contractId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return httpClient.post<ApiResponse<EmployeeContractItem>>(`/v1/contracts/${contractId}/upload-file`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  terminateContract: async (contractId: string, reason?: string) => {
    return httpClient.patch<ApiResponse<EmployeeContractItem>>(`/v1/contracts/${contractId}/terminate`, {
      terminationReason: reason,
    });
  },

  getContractTemplates: async (type?: string) => {
    const res = await httpClient.get<ApiResponse<Array<{
      templateId: string;
      name: string;
      contractTypeEnum: string;
      templateContent: string;
      placeholders: string[];
      version: number;
    }>>>("/v1/contract-templates", { params: { type } });
    return res.data;
  },

  previewContractTemplate: async (templateId: string, placeholderData?: Record<string, string>) => {
    const res = await httpClient.post<ApiResponse<{ previewHtml: string }>>(`/v1/contract-templates/${templateId}/preview`, placeholderData);
    return res.data;
  },

  generateContract: async (payload: {
    employeeId: string;
    contractTypeEnum: string;
    templateId: string;
    startDate: string;
    endDate?: string;
    baseSalary: number;
    salaryTypeEnum: string;
    signedAt?: string;
    customPlaceholders?: Record<string, string>;
  }) => {
    return httpClient.post<ApiResponse<EmployeeContractItem>>("/v1/contracts/generate", payload);
  },

  getContractDownloadUrl: async (contractId: string) => {
    const res = await httpClient.get<ApiResponse<{ downloadUrl: string }>>(`/v1/contracts/${contractId}/download-url`);
    return res.data;
  },

  updateContract: async (contractId: string, payload: Partial<EmployeeContractItem>) => {
    return httpClient.put<ApiResponse<EmployeeContractItem>>(`/v1/contracts/${contractId}`, payload);
  },

  // E-Signature Endpoints
  signCompany: async (contractId: string, confirmPassword?: string) => {
    return httpClient.post<ApiResponse<EmployeeContractItem>>(`/v1/contracts/${contractId}/sign-company`, { confirmPassword });
  },

  getPublicSigningInfo: async (signingToken: string) => {
    const res = await httpClient.get<ApiResponse<{
      employeeName: string;
      employeeEmail: string;
      employeePhone: string;
      contractTypeEnum: string;
      baseSalary: number;
      startDate: string;
      endDate?: string;
      signingStatus: string;
      companySignedFileUrl: string;
      tokenExpiresAt: string;
      otpSent: boolean;
    }>>(`/v1/contracts/sign/${signingToken}`);
    return res.data;
  },

  confirmEmployeeSigning: async (signingToken: string, payload: { otp: string; signerFullName: string; signatureImageBase64: string }) => {
    return httpClient.post<ApiResponse<EmployeeContractItem>>(`/v1/contracts/sign/${signingToken}/confirm`, payload);
  },

  resendSigningOtp: async (signingToken: string) => {
    return httpClient.post<ApiResponse<void>>(`/v1/contracts/sign/${signingToken}/resend-otp`);
  },

  getSigningHistory: async (contractId: string) => {
    const res = await httpClient.get<ApiResponse<Array<{
      id: string;
      action: string;
      signerFullName: string;
      signerEmail: string;
      ipAddress: string;
      userAgent: string;
      occurredAt: string;
      detailsJson?: string;
    }>>>(`/v1/contracts/${contractId}/signing-history`);
    return res.data;
  },

  resendSigningLink: async (contractId: string) => {
    return httpClient.post<ApiResponse<EmployeeContractItem>>(`/v1/contracts/${contractId}/resend-signing-link`);
  },

  getAttendancesByEmployeeId: async (employeeId: string, month?: string): Promise<AttendanceRecordItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<AttendanceRecordItem[]>>(`/v1/attendances/employee/${employeeId}`, { params: { month } });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Using fallback attendances", e);
    }
    return [];
  },

  getTeachingRatesByTeacherId: async (teacherId: string): Promise<TeachingRateItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TeachingRateItem[]>>(`/v1/teaching-rates/employee/${teacherId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data.map((item: any) => ({
          ...item,
          id: String(item.id),
          teacherId: String(item.employeeId ?? teacherId),
          className: item.className || `Lớp #${item.classId}`,
          rate: Number(item.rate || 0),
        }));
      }
    } catch (e) {
      console.warn("Using fallback teaching rates", e);
    }
    return [];
  },

  updateTeachingRate: async (teacherId: string, className: string, newRate: number) => {
    return httpClient.post<ApiResponse<TeachingRateItem>>("/v1/teaching-rates/update", { teacherId, className, rate: newRate });
  },

  getTeachingSessionsByTeacherId: async (teacherId: string, period?: string): Promise<TeachingSessionPaymentItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TeachingSessionPaymentItem[]>>(`/v1/teaching-session-payments/employee/${teacherId}`, { params: { period } });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data.map((item: any) => ({
          ...item,
          id: String(item.id),
          teacherId: String(item.employeeId ?? teacherId),
          className: item.className || `Buổi online #${item.classOnlineId}`,
          sessionDate: item.sessionDate || item.createdAt || "—",
          rateApplied: Number(item.rateApplied || 0),
          amount: Number(item.amount || 0),
        }));
      }
    } catch (e) {
      console.warn("Using fallback teaching sessions", e);
    }
    return [];
  },

  getSalariesByEmployeeId: async (employeeId: string): Promise<SalaryPeriodItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<SalaryPeriodItem[]>>(`/v1/salaries/employee/${employeeId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Using fallback salaries", e);
    }
    return [];
  },

  getLeaveRequestsByEmployeeId: async (employeeId: string): Promise<LeaveRequestItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<LeaveRequestItem[]>>(`/v1/leave-requests/employee/${employeeId}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Using fallback leave requests", e);
    }
    return [];
  },

  approveLeaveRequest: async (leaveId: string, status: "APPROVED" | "REJECTED", reason?: string) => {
    return httpClient.post<ApiResponse<LeaveRequestItem>>(`/v1/leave-requests/${leaveId}/approve`, null, { params: { approve: status === "APPROVED", rejectionReason: reason } });
  },

  getApprovalRequestsByUserId: async (userId: string): Promise<{ requested: ApprovalRequestItem[]; toApprove: ApprovalRequestItem[] }> => {
    try {
      const res = await httpClient.get<ApiResponse<{ requested: any[]; toApprove: any[] }>>(`/v1/approvals/user/${userId}`);
      if (res.data?.success && res.data.data) {
        const mapItem = (item: any): ApprovalRequestItem => ({
          id: String(item.id),
          objectType: item.targetType,
          objectId: String(item.targetId),
          requesterId: String(item.createdBy ?? userId),
          requesterName: String(item.createdBy ?? userId) === String(userId) ? "Nhân sự hiện tại" : `User #${item.createdBy}`,
          approverId: String(item.approverId || ""),
          approverName: `User #${item.approverId || "—"}`,
          status: item.status,
          createdAt: item.createdAt,
          rejectReason: item.comment,
        });
        return {
          requested: (res.data.data.requested || []).map(mapItem),
          toApprove: (res.data.data.toApprove || []).map(mapItem),
        };
      }
    } catch (e) {
      console.error("Không thể tải yêu cầu phê duyệt của nhân sự", e);
    }
    return {
      requested: [],
      toApprove: [],
    };
  },

  getEmployeeAuditLogs: async (employeeId: string): Promise<EmployeeAuditLogItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<{ content: any[] }>>(`/v1/audit-log/entity/EMPLOYEE/${employeeId}`, { params: { page: 0, size: 100, sort: "occurredAt:desc" } });
      if (res.data?.success && Array.isArray(res.data.data?.content)) {
        return res.data.data.content.map((item: any) => ({
          id: String(item.id),
          userId: String(item.userId || ""),
          actorName: item.userFullName || item.userEmail || `User #${item.userId || "Hệ thống"}`,
          action: item.action,
          entityType: item.entityType,
          oldValue: item.oldValue,
          newValue: item.newValue,
          timestamp: item.occurredAt,
        }));
      }
    } catch (e) {
      console.error("Không thể tải audit log của nhân sự", e);
    }
    return [];
  },

  getEmployeeCount: () =>
    httpClient.get<ApiResponse<number>>("/v1/employees/count"),

  getEmployeeStatsByStatus: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-status"),

  getEmployeeStatsByDepartment: (year?: number) =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-department", { params: { year } }),

  getEmployeeStatsByEmploymentType: (year?: number) =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-employment-type", { params: { year } }),

  getEmployeeStatsByGender: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-gender", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch gender stats", e);
    }
    return {};
  },

  getEmployeeStatsByAgeGroup: async (year?: number) => {
    try {
      const res = await httpClient.get<ApiResponse<Record<string, number>>>("/v1/employees/stats/by-age-group", { params: { year } });
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn("Failed to fetch age group stats", e);
    }
    return {};
  },

  getEmployeesPage: (params?: any) =>
    httpClient.get<ApiResponse<PageResponse<import("@/types/employee").EmployeeResponse>>>("/v1/employees/page", { params }),

  getEmployeesSearch: (params?: any) =>
    httpClient.get<ApiResponse<PageResponse<import("@/types/employee").EmployeeResponse>>>("/v1/employees/search", { params }),

  exportEmployeesToExcel: (params?: any) =>
    httpClient.get("/v1/employees/export", { params, responseType: "blob" }),

  exportEmployeeDetailToExcel: (userId: string) =>
    httpClient.get(`/v1/employees/${userId}/export-detail`, { responseType: "blob" }),

};
