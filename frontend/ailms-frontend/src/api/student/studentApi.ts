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

export type DeliveryMode = "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE";

export interface StudentCourseCard {
  id: string;
  enrollmentId: string;
  title: string;
  courseCode?: string;
  courseLink?: string;
  description?: string;
  level?: string;
  categoryName: string;
  coverImage?: string;
  thumbnailUrl?: string;
  image?: string;
  deliveryMode: DeliveryMode;
  progressPercent: number;
  expiresAt?: string;
  expired: boolean;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED";
  lastAccessedAt: string;
  teacherId?: string;
  teacherName?: string;
  teacherAvatarUrl?: string;
  reviewId?: string;
  courseRating?: number;
  courseComment?: string;
  teacherRating?: number;
  teacherComment?: string;
  certificateId?: string;
  certificateCode?: string;
  certificateStatus?: "ISSUED" | "REVOKED";
}

export interface StudentCourseReview {
  id: string;
  courseId: string;
  rating: number;
  comment?: string;
  teacherId?: string;
  teacherName?: string;
  teacherAvatarUrl?: string;
  teacherRating?: number;
  teacherComment?: string;
}

export interface StudentCourseDetail {
  courseId: string;
  courseName: string;
  status: string;
  totalLessons: number;
  totalDurationMin: number;
  enrollmentId?: string;
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
  type: "ONLINE_CLASS" | "ASSIGNMENT_DEADLINE" | "QUIZ_DEADLINE";
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
  classId?: string;
  dueDate: string;
  status: "NOT_STARTED" | "SUBMITTED" | "GRADED" | "RETURNED" | "LATE";
  score?: number;
  maxScore?: number;
  feedback?: string;
}

export interface StudentQuizItem {
  id: string;
  title: string;
  courseId: string;
  classId?: string;
  courseName: string;
  dueAt?: string;
  timeLimitMin?: number;
  maxAttempts?: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "PASSED" | "EXPIRED";
  attemptsUsed: number;
  bestScore?: number;
  passed: boolean;
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
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
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

export interface StudentClassCard {
  id: string;
  code: string;
  courseId: string;
  courseName: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  classKind?: "STANDARD" | "ONE_ON_ONE" | "ONE_ON_ONE_TRIAL";
  packageType: DeliveryMode;
  teacherName?: string;
  maxMembers?: number;
  currentMemberCount?: number;
  status: string;
  startDate?: string;
  endDate?: string;
}

export type OneOnOneRequestStatus =
  | "WAITING_INSTRUCTOR" | "INSTRUCTOR_ACCEPTED" | "CONTACTED" | "TRIAL_SCHEDULED"
  | "TRIAL_COMPLETED" | "MATCHED" | "REMATCHING" | "CANCELLED";

export interface StudentOneOnOneRequest {
  id: string;
  orderId?: string | null;
  courseId: string;
  courseName: string;
  packageName: string;
  includedTutorSessions?: number;
  status: OneOnOneRequestStatus;
  assignedInstructorName?: string | null;
  trialClassId?: string | null;
  trialSessionId?: string | null;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  trialMeetingUrl?: string | null;
  availablePeriod?: string | null;
  availableDays?: string | null;
  preferredTimes?: string | null;
  currentLevel?: string | null;
  learningSituation?: string | null;
  learningGoals?: string | null;
  weakAreas?: string | null;
  instructorPreferences?: string | null;
  additionalNotes?: string | null;
  createdAt: string;
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
  courseId: string;
  courseTitle: string;
  packageName: string;
  deliveryMode: DeliveryMode;
  price: number;
  requiresTutorNeeds: boolean;
  oneOnOneNeeds?: import("@/api/orders/orderApi").OneOnOneNeedsPayload | null;
}

export interface StudentOrderItem {
  id: string;
  items: { courseName: string; packageName: string; price: number }[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  refundRequestStatus?: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | null;
  createdAt: string;
  expiredAt?: string;
  eligibleForRefund?: boolean;
}

export interface StudentVoucher {
  id: string;
  couponId: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  applicableCourseId?: string;
  applicableCourseName?: string;
  applicableCourseNames?: string[];
  applicableCourseIds?: string[];
  validFrom?: string;
  validTo?: string;
  status: "AVAILABLE" | "RESERVED" | "USED" | "EXPIRED";
  usable: boolean;
  unavailableReason?: string;
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

  /** Gửi đánh giá khóa học và giáo viên cho khóa học đã hoàn thành. */
  createCourseReview: async (courseId: string, payload: {
    rating: number;
    comment?: string;
    teacherRating?: number;
    teacherComment?: string;
  }): Promise<StudentCourseReview> =>
    getData(await httpClient.post<ApiResponse<StudentCourseReview>>(`/v1/student/courses/${courseId}/review`, payload)),

  /** Cấp bù hoặc lấy chứng chỉ của enrollment thuộc học viên hiện tại. */
  issueCertificate: async (enrollmentId: string): Promise<StudentCertificateCard> =>
    getData(await httpClient.post<ApiResponse<StudentCertificateCard>>(
      `/v1/student/enrollments/${enrollmentId}/certificate`,
    )),

  /** Tải file PDF chứng chỉ qua API có kiểm tra chủ sở hữu. */
  downloadCertificate: async (certificateId: string): Promise<Blob> => {
    const response = await httpClient.get<Blob>(`/v1/student/certificates/${certificateId}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  /** Lấy các lớp mà tài khoản hiện tại là học viên ACTIVE. */
  getClasses: async (): Promise<StudentClassCard[]> =>
    getData(await httpClient.get<ApiResponse<StudentClassCard[]>>("/v1/classes/enrolled/me")),

  getSchedule: async (): Promise<ScheduleEventItem[]> =>
    getData(await httpClient.get<ApiResponse<ScheduleEventItem[]>>("/v1/student/schedule")),

  /** Lấy các yêu cầu matching 1-1 thuộc học viên để theo dõi sau thanh toán. */
  getOneOnOneRequests: async (): Promise<StudentOneOnOneRequest[]> =>
    getData(await httpClient.get<ApiResponse<StudentOneOnOneRequest[]>>("/v1/students/one-on-one/requests")),

  /** Học viên xác nhận tiếp tục hoặc từ chối người dạy sau buổi thử. */
  submitOneOnOneTrialResult: async (requestId: string, continueLearning: boolean): Promise<StudentOneOnOneRequest> =>
    getData(await httpClient.post<ApiResponse<StudentOneOnOneRequest>>(
      `/v1/students/one-on-one/requests/${requestId}/trial-result`, { continueLearning },
    )),

  /** Hủy vòng ghép hiện tại, cập nhật nhu cầu và tìm người dạy khác. */
  rematchOneOnOne: async (
    requestId: string,
    reason: string,
    needs: import("@/api/orders/orderApi").OneOnOneNeedsPayload,
  ): Promise<StudentOneOnOneRequest> =>
    getData(await httpClient.post<ApiResponse<StudentOneOnOneRequest>>(
      `/v1/students/one-on-one/requests/${requestId}/rematch`, { reason, needs },
    )),

  getAssignments: async (): Promise<StudentAssignmentItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentAssignmentItem[]>>("/v1/student/assignments")),

  getQuizzes: async (): Promise<StudentQuizItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentQuizItem[]>>("/v1/student/quizzes")),

  /** Bắt đầu một lượt làm quiz của học viên hiện tại. */
  startQuizAttempt: async (quizId: string): Promise<string> =>
    getData(await httpClient.post<ApiResponse<string>>(`/v1/student/quizzes/${quizId}/attempts`)),

  /** Gửi câu trả lời quiz để backend chấm và cập nhật tiến độ. */
  submitQuizAttempt: async (attemptId: string, answers: {
    questionId: string;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    answerText?: string;
  }[]): Promise<void> => {
    await httpClient.post(`/v1/student/quiz-attempts/${attemptId}/submit`, { answers });
  },

  /** Nộp nội dung hoặc tệp bài tập bằng danh tính từ JWT. */
  submitAssignment: async (assignmentId: string, payload: { contentText?: string; fileUrl?: string }): Promise<string> =>
    getData(await httpClient.post<ApiResponse<string>>(`/v1/student/assignments/${assignmentId}/submissions`, payload)),

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

  /** Lấy tất cả khóa học đủ điều kiện bán công khai, không lọc theo sở thích. */
  getAllCatalogCourses: async (params?: { page?: number; size?: number; keyword?: string }): Promise<CatalogCoursePage> =>
    getData(await httpClient.get<ApiResponse<CatalogCoursePage>>("/v1/student/catalog/all", { params })),

  getCart: async (): Promise<StudentCartItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentCartItem[]>>("/v1/student/cart")),

  /** Thêm đúng package vào giỏ và lưu kèm bản nháp nhu cầu 1-1 nếu có. */
  addToCart: async (
    coursePackageId: string,
    oneOnOneNeeds?: import("@/api/orders/orderApi").OneOnOneNeedsPayload,
  ): Promise<StudentCartItem> =>
    getData(await httpClient.post<ApiResponse<StudentCartItem>>("/v1/student/cart", {
      coursePackageId,
      oneOnOneNeeds,
    })),

  removeFromCart: async (cartItemId: string): Promise<void> => {
    await httpClient.delete(`/v1/student/cart/${cartItemId}`);
  },

  getVouchers: async (): Promise<StudentVoucher[]> =>
    getData(await httpClient.get<ApiResponse<StudentVoucher[]>>("/v1/student/vouchers")),

  validateCoupon: async (
    code: string,
    coursePackageIds: string[],
  ): Promise<{ valid: boolean; discountAmount: number; message: string }> =>
    getData(
      await httpClient.post<ApiResponse<{ valid: boolean; discountAmount: number; message: string }>>(
        "/v1/student/cart/coupon",
        { code, coursePackageIds },
      ),
    ),

  getOrders: async (): Promise<StudentOrderItem[]> =>
    getData(await httpClient.get<ApiResponse<StudentOrderItem[]>>("/v1/student/orders")),

  getOrderDetail: async (orderId: string) =>
    getData(await httpClient.get<ApiResponse<import("@/api/orders/orderApi").OrderResponse>>(`/v1/student/orders/${orderId}`)),

  downloadInvoice: async (orderId: string): Promise<Blob> =>
    (await httpClient.get<Blob>(`/v1/student/orders/${orderId}/invoice.pdf`, { responseType: "blob" })).data,

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
  historyType: string;
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
