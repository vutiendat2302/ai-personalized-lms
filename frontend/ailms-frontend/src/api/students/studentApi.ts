import httpClient from "@/api/httpClient";

import type { ApiResponse } from "@/types/base";
import type { PageResponse } from "@/types/admin";

export type GuardianRelationship = "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
export type StudyGoalTypeEnum = "DAILY_STREAK" | "WEEKLY_STUDY_DAYS" | "COURSE_COMPLETION" | "LESSON_COMPLETION" | "STUDY_HOURS";
export interface CreateStudentProfileRequest { userId: string; educationLevel?: string; description?: string; goal?: string; schoolName?: string; }
export interface CreateGuardianRequest { studentUserId: string; fullName: string; relationship: GuardianRelationship; phone?: string; email?: string; address?: string; }
export interface CreateStudyGoalRequest { userId: string; studyGoalTypeEnum: StudyGoalTypeEnum; targetValue: number; courseId?: string; }

export interface StudentProfileSearchRequest {
  page?: number;
  size?: number;
  sort?: string[];
  keyword?: string;
  isMinor?: boolean;
  hasGuardian?: boolean;
  hasEnrollment?: boolean;
  hasGoal?: boolean;
  goalTypes?: string[];
  inactiveDays?: number;
  interestIds?: string[];
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
  goalTypes?: string[];
  lastActiveAt?: string;
  enrolledCourseName?: string;
  status: "ACTIVE" | "LOCKED" | "VERIFICATION" | "DELETED";
  hasGuardian?: boolean;
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
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
}

export interface LearningActivityData { id: string; eventType: string; entityType: string; entityId?: string; entityName?: string; courseId?: string; courseName?: string; className?: string; metadata?: string; device?: string; occurredAt: string; }
export interface LearningActivityDetailData extends LearningActivityData { userId: string; fullName?: string; email?: string; entityName?: string; courseId?: string; courseName?: string; className?: string; }
export interface EnrollmentData { id: string; courseId: string; courseName?: string; classId?: string; className?: string; status: number; enrolledAt?: string; completedAt?: string; }
export interface StudentOrderData { id: string; status: string; totalAmount: number; finalAmount: number; paidAt?: string; createdAt: string; }
export interface StudentOrderDetailData extends StudentOrderData { userId: string; userName?: string; discountAmount: number; couponCode?: string; expiredAt?: string; items: Array<{ id: string; coursePackageId: string; coursePackageName?: string; priceSnapshot: number; itemType: string; relatedEnrollmentId?: string }>; }
export interface StudentPaymentData { id: string; orderId: string; transactionRef?: string; paymentMethod?: string; amount: number; status: string; paidAt?: string; createdAt: string; }

export const studentApi = {
  getStudentProfilesCount: () =>
    httpClient.get<ApiResponse<number>>("/v1/students/count"),

  createProfile: (payload: CreateStudentProfileRequest) =>
    httpClient.post<ApiResponse<StudentProfileData>>("/v1/students", payload),

  createGuardian: (payload: CreateGuardianRequest) =>
    httpClient.post<ApiResponse<GuardianData>>("/v1/guardians", payload),

  createStudyGoal: (payload: CreateStudyGoalRequest) =>
    httpClient.post<ApiResponse<StudyGoalData>>("/v1/study-goals", payload),

  assignInterests: (payload: { interestIds: string[] }) =>
    httpClient.post<ApiResponse<void>>("/v1/students/interests", payload),

  updateHasGoal: (studentUserId: string, hasGoal: boolean) =>
    httpClient.patch<ApiResponse<StudentProfileData>>(`/v1/students/${studentUserId}/has-goal`, { hasGoal }),

  getStudentsPage: (params?: any) =>
    httpClient.get<ApiResponse<PageResponse<StudentProfileData>>>("/v1/students/search", { params }),

  getStudentById: (id: string) =>
    httpClient.get<ApiResponse<StudentProfileData>>(`/v1/students/${id}`),

  updateStudentProfile: (id: string, payload: any) =>
    httpClient.put<ApiResponse<StudentProfileData>>(`/v1/students/${id}`, payload),

  // 6.8.1 Overview Stats Endpoints
  getOverviewStats: () =>
    httpClient.get<ApiResponse<{
      totalActiveStudents: number;
      newStudentsThisMonth: number;
      minorWithoutGuardian: number;
      minorWithoutEnrollment: number;
      genderDistribution: Record<string, number>;
      statusDistribution: Record<string, number>;
      monthlyNewStudents: Record<string, number>;
    }>>("/v1/students/stats/overview")
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

  getActivityLogsByDate: (date: string) =>
    httpClient.get<ApiResponse<LearningActivityDetailData[]>>("/v1/students/stats/activity-logs", { params: { date } })
      .then(res => res.data.data || []),

  getInactiveWarningCount: (days: number = 7) =>
    httpClient.get<ApiResponse<number>>("/v1/students/stats/inactive-warning", { params: { days } })
      .then(res => res.data.data),

  getTopInterests: () =>
    httpClient.get<ApiResponse<Record<string, number>>>("/v1/students/stats/interests")
      .then(res => res.data.data),

  // Guardian CRUD
  getGuardians: (studentUserId: string) =>
    httpClient.get<ApiResponse<GuardianData[]>>(`/v1/guardians/student/${studentUserId}`)
      .then(res => res.data.data || []),

  addGuardian: (payload: any) =>
    httpClient.post<ApiResponse<GuardianData>>("/v1/guardians", payload),

  // Study Goals for Student
  getStudyGoals: (studentUserId: string) =>
    httpClient.get<ApiResponse<Array<{ id: string; studyGoalTypeEnum: string; targetValue: number; currentStreak: number; longestStreak: number; status: StudyGoalData["status"] }>>>(`/v1/study-goals/user/${studentUserId}`)
      .then(res => (res.data.data || []).map(goal => ({ ...goal, goalType: goal.studyGoalTypeEnum, progressPercent: Math.min(100, Math.round(((goal.currentStreak || 0) / Math.max(1, goal.targetValue)) * 100)) }))),

  // Interests for Student
  getStudentInterests: (studentUserId: string) =>
    httpClient.get<ApiResponse<string[]>>(`/v1/students/${studentUserId}/interests`)
      .then(res => res.data.data || []),

  assignStudentInterests: (studentUserId: string, interestIds: string[]) =>
    httpClient.post<ApiResponse<void>>(`/v1/students/${studentUserId}/interests`, { interestIds }),

  getLearningActivities: (studentUserId: string) =>
    httpClient.get<ApiResponse<LearningActivityData[]>>(`/v1/learning-activity-logs/user/${studentUserId}`).then(res => res.data.data || []),

  getEnrollments: (studentUserId: string) =>
    httpClient.get<ApiResponse<EnrollmentData[]>>(`/v1/enrollments/user/${studentUserId}`).then(res => res.data.data || []),

  getOrders: (studentUserId: string) =>
    httpClient.get<ApiResponse<StudentOrderData[]>>(`/v1/orders/user/${studentUserId}`).then(res => res.data.data || []),

  getOrderDetail: (orderId: string) =>
    httpClient.get<ApiResponse<StudentOrderDetailData>>(`/v1/orders/${orderId}`).then(res => res.data.data),

  getOrderPayments: (orderId: string) =>
    httpClient.get<ApiResponse<StudentPaymentData[]>>(`/v1/payments/order/${orderId}`)
      .then(res => (res.data.data || []).filter(payment => String(payment.orderId) === String(orderId))),

  sendNotification: (studentUserId: string, payload: { type: "ADMIN_ANNOUNCEMENT" | "ADMIN_WARNING"; title: string; content: string }) =>
    httpClient.post<ApiResponse<void>>("/v1/notifications", { ...payload, userIds: [studentUserId] }),
};
