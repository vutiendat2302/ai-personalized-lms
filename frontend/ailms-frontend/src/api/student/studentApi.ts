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
  continueLearning?: {
    courseId: string;
    courseName: string;
    lessonId: string;
    lessonTitle: string;
    progressPercent: number;
  };
  smartToDo: {
    id: string;
    type: "ASSIGNMENT_DUE" | "ONLINE_CLASS" | "PACKAGE_EXPIRING";
    title: string;
    subtitle: string;
    dueTime: string;
    isUrgent: boolean;
  }[];
}

export interface StudentCourseCard {
  id: string;
  title: string;
  categoryName: string;
  coverImage?: string;
  deliveryMode: "SELF_PACED" | "LIVE_CLASS" | "HYBRID" | "ONE_ON_ONE";
  progressPercent: number;
  expiresAt: string;
  isExpired: boolean;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  lastAccessedAt: string;
}

export interface StudentCourseDetail {
  id: string;
  title: string;
  description: string;
  deliveryMode: "SELF_PACED" | "LIVE_CLASS" | "HYBRID" | "ONE_ON_ONE";
  teacherName?: string;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      contentType: "VIDEO" | "TEXT" | "PDF";
      isCompleted: boolean;
      isLocked: boolean;
      videoUrl?: string;
      textContent?: string;
      pdfUrl?: string;
      hasQuiz?: boolean;
      quizId?: string;
      hasAssignment?: boolean;
      assignmentId?: string;
    }[];
  }[];
}

export interface ScheduleEventItem {
  id: string;
  title: string;
  type: "ONLINE_CLASS" | "ASSIGNMENT_DUE" | "QUIZ_DUE";
  className?: string;
  teacherName?: string;
  timeStr: string;
  dateStr: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  roomUrl?: string;
  isPendingMatching?: boolean;
}

export interface StudentAssignmentItem {
  id: string;
  title: string;
  courseName: string;
  itemType: "ASSIGNMENT" | "QUIZ";
  dueDate: string;
  status: "NOT_STARTED" | "SUBMITTED" | "GRADED" | "RETURNED" | "LATE";
  score?: number;
  maxScore: number;
  feedback?: string;
  attemptsLeft?: number;
  maxAttempts?: number;
}

export interface StudentCertificateCard {
  id: string;
  certificateCode: string;
  courseName: string;
  issuedAt?: string;
  isUnlocked: boolean;
  requiredConditionText?: string;
  verifyUrl: string;
}

export interface StudentProgressAnalytics {
  activityLogs: { date: string; hoursSpent: number }[];
  courseProgress: { courseName: string; progressPercent: number; avgQuizScore: number; targetPercent: number }[];
  contributionHeatmap: { date: string; count: number }[];
}

export interface StudyGoalItem {
  id: string;
  goalType: "DAILY_STREAK" | "WEEKLY_STUDY_DAYS" | "COURSE_COMPLETION" | "LESSON_COMPLETION" | "STUDY_HOURS";
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: "IN_PROGRESS" | "COMPLETED";
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
  isEnrolled: boolean;
  packages: {
    id: string;
    name: string;
    deliveryMode: "SELF_PACED" | "LIVE_CLASS" | "HYBRID" | "ONE_ON_ONE";
    price: number;
  }[];
}

export interface StudentCartItem {
  id: string;
  coursePackageId: string;
  courseTitle: string;
  packageName: string;
  deliveryMode: string;
  price: number;
  selectedTimeSlots?: string[];
  isSelected: boolean;
}

export interface StudentOrderItem {
  id: string;
  snowflakeId: string;
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

const getData = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export const studentApi = {
  getDashboardMetrics: async (): Promise<StudentDashboardMetrics> =>
    getData(await httpClient.get<ApiResponse<StudentDashboardMetrics>>("/v1/student/dashboard/metrics")),

  submitOnboarding: async (goal: unknown, interests: string[]): Promise<boolean> => {
    await httpClient.post("/v1/student/onboarding", { goal, interests });
    return true;
  },

  getCourses: async (): Promise<StudentCourseCard[]> =>
    getData(await httpClient.get<ApiResponse<StudentCourseCard[]>>("/v1/student/courses")),

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

  getCatalog: async (): Promise<CatalogCourseItem[]> =>
    getData(await httpClient.get<ApiResponse<CatalogCourseItem[]>>("/v1/student/catalog")),

  getCart: async (): Promise<StudentCartItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentCartItem[]>>("/v1/student/cart")),

  validateCoupon: async (
    code: string,
    courseId?: string,
  ): Promise<{ isValid: boolean; discountAmount: number; message: string }> =>
    getData(
      await httpClient.post<ApiResponse<{ isValid: boolean; discountAmount: number; message: string }>>(
        "/v1/student/cart/coupon",
        { code, courseId },
      ),
    ),

  getOrders: async (): Promise<StudentOrderItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentOrderItem[]>>("/v1/student/orders")),

  requestRefund: async (orderId: string, reason: string): Promise<boolean> => {
    await httpClient.post(`/v1/orders/${orderId}/refund`, { reason });
    return true;
  },
};
