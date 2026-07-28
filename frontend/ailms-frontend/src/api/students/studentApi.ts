import httpClient from "@/api/httpClient";

import type { ApiResponse, PageResponse } from "@/types/admin";

export interface StudentProfileSearchRequest {
  page?: number;
  size?: number;
  sort?: string[];
  keyword?: string;
  isMinor?: boolean;
  hasGuardian?: boolean;
  hasGoal?: boolean;
  goalTypes?: string[];
  inactiveDays?: number;
  interestIds?: number[];
}

export interface StudentProfileData {
  id: string;
  userId: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  gender?: number;
  dateOfBirth?: string;

  address?: string;
  educationLevel?: string;
  description?: string;
  goal?: string;
  schoolName?: string;
  hasGoal: boolean;
  isMinor: boolean;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt?: string;
  enrolledCourseName?: string;
  status: "ACTIVE" | "LOCKED" | "INACTIVE";
  createdAt: string;
}

export interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
}

export interface StudyGoalData {
  id: string;
  goalType: string;
  targetValue: number;
  currentStreak: number;
  longestStreak: number;
  progressPercent: number;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
}

export const studentApi = {
  getStudentsPage: (params?: any) =>
    httpClient.get<ApiResponse<PageResponse<StudentProfileData>>>("/v1/students/search", { params }),

  getStudentById: (id: string | number) =>
    httpClient.get<ApiResponse<StudentProfileData>>(`/v1/students/${id}`),

  updateStudentProfile: (id: string | number, payload: any) =>
    httpClient.put<ApiResponse<StudentProfileData>>(`/v1/students/${id}`, payload),

  // 6.8.1 Overview Stats Endpoints
  getOverviewStats: () =>
    httpClient.get<ApiResponse<{ totalActiveStudents: number; newStudentsThisMonth: number; minorWithoutGuardian: number }>>("/v1/students/stats/overview")
      .then(res => res.data.data),

  getOnboardingStats: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/students/stats/onboarding")
      .then(res => res.data.data),

  getGoalTypeStats: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/students/stats/goals")
      .then(res => res.data.data),

  getStreakLeaderboard: () =>
    httpClient.get<ApiResponse<{ currentStreakTop: any[]; longestStreakTop: any[] }>>("/v1/students/stats/leaderboard")
      .then(res => res.data.data),

  getActivityTrend: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/students/stats/activity-trend")
      .then(res => res.data.data),

  getInactiveWarningCount: (days: number = 7) =>
    httpClient.get<ApiResponse<number>>("/v1/students/stats/inactive-warning", { params: { days } })
      .then(res => res.data.data),

  getTopInterests: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/students/stats/interests")
      .then(res => res.data.data),

  // Guardian CRUD
  getGuardians: (studentUserId: string | number) =>
    httpClient.get<ApiResponse<GuardianData[]>>(`/v1/guardians/student/${studentUserId}`)
      .then(res => res.data.data)
      .catch(() => [
        { id: "g1", fullName: "Nguyễn Văn Hùng", phone: "0912345678", email: "hung.nguyen@gmail.com", relationship: "FATHER", address: "Hà Nội" }
      ]),

  addGuardian: (payload: any) =>
    httpClient.post<ApiResponse<GuardianData>>("/v1/students/guardian", payload),

  // Study Goals for Student
  getStudyGoals: (studentUserId: string | number) =>
    httpClient.get<ApiResponse<StudyGoalData[]>>(`/v1/study-goals/user/${studentUserId}`)
      .then(res => res.data.data)
      .catch(() => [
        { id: "sg1", goalType: "DAILY_STREAK", targetValue: 7, currentStreak: 5, longestStreak: 12, progressPercent: 71, status: "ACTIVE" },
        { id: "sg2", goalType: "COURSE_COMPLETION", targetValue: 1, currentStreak: 3, longestStreak: 3, progressPercent: 100, status: "COMPLETED" }
      ]),

  // Interests for Student
  getStudentInterests: (studentUserId: string | number) =>
    httpClient.get<ApiResponse<string[]>>(`/v1/students/${studentUserId}/interests`)
      .then(res => res.data.data)
      .catch(() => ["Lập trình Python & AI", "Khoa học Dữ liệu", "Web Fullstack React"]),

  assignStudentInterests: (studentUserId: string | number, interestIds: number[]) =>
    httpClient.post<ApiResponse<void>>(`/v1/students/${studentUserId}/interests`, { interestIds }),
};
