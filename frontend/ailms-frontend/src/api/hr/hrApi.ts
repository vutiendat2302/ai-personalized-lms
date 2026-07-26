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
  employeeCode: string;
  contractType: ContractType;
  fileKey?: string;
  fileUrl?: string;
  signedAt: string;
  validFrom: string;
  validTo?: string;
  status: "ACTIVE" | "EXPIRED" | "TERMINATED";
  baseSalary: number;
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

export const hrApi = {
  // Employees
  getEmployees: (params?: any) =>
    httpClient.get<ApiResponse<EmployeeResponse[]>>("/v1/employees", { params }),

  createEmployee: (payload: CreateEmployeeRequest) =>
    httpClient.post<ApiResponse<EmployeeResponse>>("/v1/employees", payload),

  softDeleteEmployee: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/employees/${id}`),

  getTrashEmployees: () =>
    httpClient.get<ApiResponse<EmployeeResponse[]>>("/v1/employees/trash"),

  hardDeleteEmployee: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/employees/trash/${id}`),

  bulkHardDeleteEmployees: (ids: (string | number)[]) =>
    httpClient.post<ApiResponse<any>>(
      "/v1/employees/trash/bulk-hard-delete",
      ids.map((id) => Number(id)).filter((n) => !isNaN(n))
    ),

  // Contracts
  getContracts: (employeeId?: string) =>
    httpClient.get<ApiResponse<EmployeeContractResponse[]>>("/v1/employee-contracts", { params: { employeeId } }),

  createContract: (payload: any) =>
    httpClient.post<ApiResponse<EmployeeContractResponse>>("/v1/employee-contracts", payload),

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
