import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export type EmploymentType = "FULL_TIME" | "PART_TIME";
export type EmployeeStatus = "ACTIVE" | "PROBATION" | "EXPIRED" | "TERMINATED";
export type ContractType = "PROBATION" | "OFFICIAL" | "PART_TIME";
export type AttendanceStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT" | "ON_LEAVE";
export type SalaryStatus = "DRAFT" | "APPROVED" | "PAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNPAID" | "CANCELLED";

export interface EmployeeResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeCode: string; // Format: EP-2607-A3F9C1
  fullName: string;
  departmentId?: string;
  departmentName?: string;
  position: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  baseSalary?: number;
  joinedAt: string;
  probationEndDate?: string;
}

export interface CreateEmployeeRequest {
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  position: string;
  employmentType: EmploymentType;
  baseSalary?: number;
  probationEndDate?: string;
}

export interface EmployeeContractResponse {
  id: string;
  employeeId: string;
  employeeCode?: string;
  fullName?: string;
  departmentName?: string;
  position?: string;
  contractType?: ContractType | string;
  contractTypeEnum?: string;
  fileKey?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  signedAt?: string;
  startDate?: string;
  endDate?: string;
  validFrom?: string;
  validTo?: string;
  status: "ACTIVE" | "EXPIRED" | "TERMINATED" | "INACTIVE" | string;
  signingStatus?: "PENDING_COMPANY_SIGN" | "PENDING_EMPLOYEE_SIGN" | "FULLY_SIGNED" | string;
  signingToken?: string;
  signingTokenExpiresAt?: string;
  originalFileDownloadUrl?: string;
  downloadUrl?: string;
  baseSalary: number;
  salaryTypeEnum?: "HOURLY" | "DAILY" | "MONTHLY" | string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  terminationReason?: string;
  terminatedAt?: string;
}

export interface ContractDashboardStatsResponse {
  totalContracts: number;
  activeContracts: number;
  expiringSoonContracts: number;
  probationExpiringContracts: number;
  signedThisMonthContracts: number;
  terminatedThisMonthContracts: number;
  missingFileContracts: number;
  unsignedContracts: number;
  pendingCompanySignCount: number;
  pendingEmployeeSignCount: number;
  fullySignedCount: number;
  contractTypeDistribution?: Record<string, number>;
  salaryTypeDistribution?: Record<string, number>;
  departmentDistribution?: Record<string, number>;
  expiryTimeline6Months?: Record<string, number>;
}

export interface AttendanceResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  penaltyAmount?: number;
}

export interface SalaryResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employmentType: EmploymentType;
  period: string; // e.g. "2026-07"
  grossSalary: number;
  insuranceDeduction: number;
  taxDeduction: number;
  penaltyDeduction: number;
  netSalary: number;
  status: SalaryStatus;
  paidAt?: string;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
}

export type OneOnOneRequestStatus =
  | "WAITING_INSTRUCTOR"
  | "INSTRUCTOR_ACCEPTED"
  | "CONTACTED"
  | "TRIAL_SCHEDULED"
  | "TRIAL_COMPLETED"
  | "MATCHED"
  | "REMATCHING"
  | "CANCELLED";

export interface HrOneOnOneRequestResponse {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  studentName: string;
  courseName: string;
  packageName: string;
  status: OneOnOneRequestStatus;
  assignedInstructorName?: string | null;
  assignedInstructorId?: string | null;
  availablePeriod?: string | null;
  availableDays?: string | null;
  preferredTimes?: string | null;
  createdAt: string;
}

export interface HrInstructorCandidateResponse {
  instructorId: string;
  instructorName: string;
  employeeCode: string;
  role: string;
}

export const hrApi = {
  /** Lấy các yêu cầu học 1-1 để HR theo dõi và xác nhận kết nối. */
  getOneOnOneRequests: async () =>
    httpClient.get<ApiResponse<HrOneOnOneRequestResponse[]>>("/v1/hr/one-on-one/requests"),

  /** Đánh dấu HR đã kết nối học viên với người dạy được phân công. */
  markOneOnOneContacted: async (requestId: string) =>
    httpClient.post<ApiResponse<HrOneOnOneRequestResponse>>(
      `/v1/hr/one-on-one/requests/${requestId}/mark-contacted`,
    ),

  /** Từ chối người đang nhận lớp và mở lại matching cho người dạy khác. */
  rejectOneOnOneConnection: async (requestId: string, reason: string) =>
    httpClient.post<ApiResponse<HrOneOnOneRequestResponse>>(
      `/v1/hr/one-on-one/requests/${requestId}/reject-connection`,
      { reason },
    ),

  /** Lấy Teacher/TA ACTIVE thuộc đúng danh mục và chưa bị loại khỏi yêu cầu. */
  getOneOnOneInstructorCandidates: async (requestId: string) =>
    httpClient.get<ApiResponse<HrInstructorCandidateResponse[]>>(
      `/v1/hr/one-on-one/requests/${requestId}/instructor-candidates`,
    ),

  /** Gửi thông báo lớp 1-1 tới các Teacher/TA do HR lựa chọn. */
  notifyOneOnOneInstructors: async (requestId: string, instructorIds: string[]) =>
    httpClient.post<ApiResponse<void>>(
      `/v1/hr/one-on-one/requests/${requestId}/notify-instructors`,
      { instructorIds },
    ),

  // Employees
  getEmployees: (params?: any) =>
    httpClient.get<ApiResponse<EmployeeResponse[]>>("/v1/employees", { params }),

  createEmployee: (payload: CreateEmployeeRequest) =>
    httpClient.post<ApiResponse<EmployeeResponse>>("/v1/employees", payload),

  softDeleteEmployee: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/employees/${id}`),

  getTrashEmployees: () =>
    httpClient.get<ApiResponse<EmployeeResponse[]>>("/v1/employees/trash"),

  hardDeleteEmployee: (id: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/employees/trash/${id}`),

  bulkHardDeleteEmployees: (ids: string[]) =>
    httpClient.post<ApiResponse<any>>(
      "/v1/employees/trash/bulk-hard-delete", ids),

  // Contracts
  getContracts: (employeeId?: string) =>
    httpClient.get<ApiResponse<EmployeeContractResponse[]>>("/v1/employee-contracts", { params: { employeeId } }),

  createContract: (payload: any) =>
    httpClient.post<ApiResponse<EmployeeContractResponse>>("/v1/employee-contracts", payload),

  deleteAllEmployeeContracts: (employeeId: string) =>
    httpClient.delete<ApiResponse<void>>(`/v1/contracts/employee/${employeeId}`),

  bulkTerminateContracts: (ids: string[], reason?: string) =>
    httpClient.post<ApiResponse<any>>("/v1/employee-contracts/bulk-terminate", { ids, reason }),

  bulkRemindExpiration: (payload: { ids: string[]; recipientUserIds: string[]; subject?: string; content: string }) =>
    httpClient.post<ApiResponse<any>>("/v1/employee-contracts/bulk-remind-expiration", payload),

  bulkDownloadContractsZip: (ids: string[]) =>
    httpClient.post("/v1/employee-contracts/bulk-download-zip", { ids }, { responseType: "blob" }),

  getContractReminderRecipients: () =>
    httpClient.get<ApiResponse<Array<{ id: string; fullName: string; email: string }>>>("/v1/employee-contracts/reminder-recipients"),

  getExpiringProbationContracts: () =>
    httpClient.get<ApiResponse<EmployeeContractResponse[]>>("/v1/employee-contracts/expiring-probation"),

  getDashboardStats: () =>
    httpClient.get<ApiResponse<ContractDashboardStatsResponse>>("/v1/contracts/dashboard-stats"),

  // Attendance
  getAttendances: (params?: any) =>
    httpClient.get<ApiResponse<AttendanceResponse[]>>("/v1/attendances", { params }),

  recordAttendance: (payload: { employeeId: string; checkInTime?: string; checkOutTime?: string }) =>
    httpClient.post<ApiResponse<AttendanceResponse>>("/v1/attendances/record", payload),

  // Salary Payroll
  getSalaries: (params?: any) =>
    httpClient.get<ApiResponse<SalaryResponse[]>>("/v1/salaries", { params }),

  generatePayroll: (period: string) =>
    httpClient.post<ApiResponse<SalaryResponse[]>>("/v1/salaries/generate", { period }),

  approveSalary: (id: string) =>
    httpClient.post<ApiResponse<SalaryResponse>>(`/v1/salaries/${id}/approve`),

  // Leave Requests
  getLeaveRequests: (params?: any) =>
    httpClient.get<ApiResponse<LeaveRequestResponse[]>>("/v1/leave-requests", { params }),

  createLeaveRequest: (payload: { startDate: string; endDate: string; reason: string }) =>
    httpClient.post<ApiResponse<LeaveRequestResponse>>("/v1/leave-requests", payload),

  approveLeaveRequest: (id: string, status: "APPROVED" | "REJECTED", reason?: string) =>
    httpClient.post<ApiResponse<LeaveRequestResponse>>(`/v1/leave-requests/${id}/approve`, { status, reason }),
};
