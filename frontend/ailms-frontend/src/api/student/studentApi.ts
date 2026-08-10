import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export interface StudentDashboardMetrics {
  currentStreak: number;
  longestStreak: number;
  activeCoursesCount: number;
  completedCoursesCount: number;
  upcomingDeadlinesCount: number;
  averageQuizScore: number;
  hasSetGoals: boolean;
  upcomingAssignments: {
    id: string;
    courseId: string;
    courseName?: string;
    title: string;
    dueDate: string;
    urgent: boolean;
  }[];
}

export type DeliveryMode = "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";

export interface StudentCourseCard {
  id: string;
  title: string;
  courseCode?: string;
  courseLink?: string;
  description?: string;
  level?: string;
  categoryName: string;
  coverImage?: string;
  deliveryMode: DeliveryMode;
  progressPercent: number;
  expiresAt?: string;
  expired: boolean;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  lastAccessedAt: string;
}

export interface StudentCourseDetail {
  courseId: string;
  courseName: string;
  status: string;
  totalLessons: number;
  totalDurationMin: number;
  sections: {
    id: string;
    name: string;
    lessons: {
      id: string;
      name: string;
      contentType: string;
      contentUrl?: string;
      description?: string;
      completed: boolean;
      progressPercent: number;
    }[];
  }[];
}

export interface ScheduleEventItem {
  id: string;
  title: string;
  type: "ONLINE_CLASS";
  className?: string;
  teacherName?: string;
  startAt: string;
  endAt?: string;
  roomUrl?: string;
  isPendingMatching?: boolean;
}

export interface StudentAssignmentItem {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueDate: string;
  status: "NOT_STARTED" | "SUBMITTED" | "GRADED" | "RETURNED" | "LATE";
  score?: number;
  maxScore?: number;
  feedback?: string;
}

export interface StudentCertificateCard {
  id: string;
  certificateCode: string;
  courseName: string;
  issuedAt?: string;
  courseId: string;
  status: "ISSUED" | "REVOKED";
  downloadUrl?: string;
}

export interface StudentProgressAnalytics {
  activityLogs: { date: string; hoursSpent: number }[];
  courseProgress: { courseId: string; courseName: string; progressPercent: number; averageQuizScore?: number }[];
  contributionHeatmap: { date: string; count: number }[];
}

export interface StudyGoalItem {
  id: string;
  studyGoalTypeEnum: "DAILY_STREAK" | "WEEKLY_STUDY_DAYS" | "COURSE_COMPLETION" | "LESSON_COMPLETION" | "STUDY_HOURS";
  targetValue: number;
  currentValue: number;
  courseId?: string;
  currentStreak?: number;
  longestStreak?: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface CatalogCourseItem {
  id: string;
  title: string;
  categoryName: string;
  description: string;
  rating: number;
  reviewCount: number;
  originalPrice: number;
  sellingPrice: number;
  enrolled: boolean;
  personalized: boolean;
  packages: {
    id: string;
    name: string;
    deliveryMode: DeliveryMode;
    price: number;
  }[];
}

export interface CatalogCoursePage {
  content: CatalogCourseItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface StudentCartItem {
  id: string;
  coursePackageId: string;
  courseTitle: string;
  packageName: string;
  deliveryMode: DeliveryMode;
  price: number;
}

export interface StudentOrderItem {
  id: string;
  items: { courseName: string; packageName: string; price: number }[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  createdAt: string;
  expiredAt?: string;
  isEligibleForRefund?: boolean;
}

/** Hồ sơ onboarding và lựa chọn cá nhân hóa của học viên. */
export interface StudentPersonalization {
  userId: string;
  educationLevel?: string;
  goal?: string;
  description?: string;
  schoolName?: string;
  hasGoal: boolean;
  studyGoals: StudyGoalItem[];
  interests: { id: string; code: string; name: string; description?: string; note?: string }[];
  topics: { id: string; code: string; name: string; description?: string; note?: string }[];
}

const getData = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export const studentApi = {
  /** Lấy thông tin cá nhân hóa của học viên hiện tại. */
  getPersonalization: async (): Promise<StudentPersonalization> =>
    getData(await httpClient.get<ApiResponse<StudentPersonalization>>("/v1/student/profile/personalization")),

  getDashboardMetrics: async (): Promise<StudentDashboardMetrics> =>
    getData(await httpClient.get<ApiResponse<StudentDashboardMetrics>>("/v1/student/dashboard/metrics")),

  submitOnboarding: async (goal: { goalType: string; targetValue: number }, interests: string[]): Promise<boolean> => {
    await httpClient.post("/v1/student/onboarding", {
      goal: { studyGoalTypeEnum: goal.goalType, targetValue: goal.targetValue },
      interestIds: interests,
    });
    return true;
  },

  getCourses: async (status?: StudentCourseCard["status"]): Promise<StudentCourseCard[]> =>
    getData(await httpClient.get<ApiResponse<StudentCourseCard[]>>("/v1/student/courses", { params: status ? { status } : undefined })),

  getCourseDetail: async (id: string): Promise<StudentCourseDetail> =>
    getData(await httpClient.get<ApiResponse<StudentCourseDetail>>(`/v1/student/courses/${id}`)),

  getSchedule: async (): Promise<ScheduleEventItem[]> =>
    getData(await httpClient.get<ApiResponse<ScheduleEventItem[]>>("/v1/student/schedule")),

  getAssignments: async (): Promise<StudentAssignmentItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentAssignmentItem[]>>("/v1/student/assignments")),

  getCertificates: async (): Promise<StudentCertificateCard[]> =>
    getData(await httpClient.get<ApiResponse<StudentCertificateCard[]>>("/v1/student/certificates")),

  getProgressAnalytics: async (): Promise<StudentProgressAnalytics> =>
    getData(await httpClient.get<ApiResponse<StudentProgressAnalytics>>("/v1/student/progress")),

  getGoals: async (): Promise<StudyGoalItem[]> =>
    getData(await httpClient.get<ApiResponse<StudyGoalItem[]>>("/v1/student/goals")),

  createGoal: async (goal: Partial<StudyGoalItem>): Promise<StudyGoalItem> =>
    getData(await httpClient.post<ApiResponse<StudyGoalItem>>("/v1/student/goals", goal)),

  /** Cập nhật mục tiêu chung hiện tại của học viên. */
  updateGoal: async (id: string, goal: Partial<StudyGoalItem>): Promise<StudyGoalItem> =>
    getData(await httpClient.put<ApiResponse<StudyGoalItem>>(`/v1/student/goals/${id}`, goal)),

  getCatalog: async (params?: { page?: number; size?: number; keyword?: string }): Promise<CatalogCoursePage> =>
    getData(await httpClient.get<ApiResponse<CatalogCoursePage>>("/v1/student/catalog", { params })),

  getCart: async (): Promise<StudentCartItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentCartItem[]>>("/v1/student/cart")),

  addToCart: async (coursePackageId: string): Promise<StudentCartItem> =>
    getData(await httpClient.post<ApiResponse<StudentCartItem>>("/v1/student/cart", { coursePackageId })),

  validateCoupon: async (
    code: string,
    courseId?: string,
  ): Promise<{ valid: boolean; discountAmount: number; message: string }> =>
    getData(
      await httpClient.post<ApiResponse<{ valid: boolean; discountAmount: number; message: string }>>(
        "/v1/student/cart/coupon",
        { code, courseId },
      ),
    ),

  getOrders: async (): Promise<StudentOrderItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentOrderItem[]>>("/v1/student/orders")),

  requestRefund: async (orderId: string, reason: string): Promise<boolean> => {
    await httpClient.post(`/v1/student/orders/${orderId}/refund`, { reason });
    return true;
  },

  // Student Activities (Learning & System History)
  getLearningHistory: async (page = 0, size = 20, filters?: StudentActivityHistoryFilters): Promise<StudentActivityPageResponse> =>
    getData(await httpClient.get<ApiResponse<StudentActivityPageResponse>>("/v1/student/activities/learning", { params: { page, size, ...filters } })),

  getLearningHistoryDetail: async (id: string): Promise<StudentActivityHistoryItem> =>
    getData(await httpClient.get<ApiResponse<StudentActivityHistoryItem>>(`/v1/student/activities/learning/${id}`)),

  deleteLearningHistory: async (id: string): Promise<boolean> => {
    await httpClient.delete(`/v1/student/activities/learning/${id}`);
    return true;
  },

  getSystemHistory: async (page = 0, size = 20, filters?: StudentActivityHistoryFilters): Promise<StudentActivityPageResponse> =>
    getData(await httpClient.get<ApiResponse<StudentActivityPageResponse>>("/v1/student/activities/system", { params: { page, size, ...filters } })),

  getSystemHistoryDetail: async (id: string): Promise<StudentActivityHistoryItem> =>
    getData(await httpClient.get<ApiResponse<StudentActivityHistoryItem>>(`/v1/student/activities/system/${id}`)),

  deleteSystemHistory: async (id: string): Promise<boolean> => {
    await httpClient.delete(`/v1/student/activities/system/${id}`);
    return true;
  },
};

export interface StudentActivityHistoryItem {
  id: string;
  historyType: "LEARNING" | "SYSTEM" | string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  metadata?: string | null;
  device?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt: string;
}

/** Bộ lọc lịch sử hoạt động theo hành động và khoảng thời gian. */
export interface StudentActivityHistoryFilters {
  action?: string;
  from?: string;
  to?: string;
}

export interface StudentActivityPageResponse {
  content: StudentActivityHistoryItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
