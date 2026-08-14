import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { AtRiskStudentData } from "@/components/teacher/StudentRiskRow";
import type { SubmissionItem } from "@/components/teacher/GradingQueueItem";
export type { SubmissionItem };

export interface TeacherDashboardMetrics {
  unreviewedSessionsCount: number;
  unreviewedMinSecondsLeft: number; // e.g. 18 * 3600 = 64800
  pendingGradingAssignmentsCount: number;
  pendingFillBlankQuizzesCount: number;
  newSuggestedClassesCount: number;
  atRiskStudentsCount: number;

  activeClassesCount: number;
  sessionsThisWeekCompleted: number;
  sessionsThisWeekTotal: number;
  averageRating: number;
  estimatedEarningsMonth: number;
}

export interface AgendaSessionItem {
  id: string;
  className: string;
  courseName: string;
  sessionTime: string;
  roomUrl: string;
  studentCount: number;
  status: "SCHEDULED" | "UPCOMING" | "LIVE" | "UNREVIEWED" | "COMPLETED";
  secondsLeftToReview?: number;
}

export interface TeacherClassCard {
  id: string;
  className: string;
  courseName: string;
  deliveryMode: "GROUP_CLASS" | "ONE_ON_ONE";
  currentStudents: number;
  maxStudents: number;
  roleInClass: "TEACHER" | "TA";
  scheduleSummary: string; // e.g. "T2 19h-21h, T5 19h-21h"
  avgProgressPercent: number;
  status: "ACTIVE" | "COMPLETED";
}

export interface ClassStudentDetail {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  progressPercent: number;
  avgQuizScore: number;
  lastAccessedAt: string;
  isAtRisk: boolean;
  daysInactive?: number;
  expectedPercent?: number;
  riskReason?: string;
}

export interface OnlineClassSession {
  id: string;
  classId: string;
  className: string;
  courseName: string;
  title: string;
  startTime: string;
  endTime: string;
  startHour: number;
  endHour: number;
  dateStr: string; // e.g. "2026-08-03"
  dayOfWeek: number; // 0: Mon, 1: Tue, 2: Wed, 3: Thu, 4: Fri, 5: Sat, 6: Sun
  roomUrl: string;
  status: "SCHEDULED" | "UNREVIEWED" | "REVIEWED" | "CANCELLED";
  secondsLeftToReview?: number;
  attendanceData?: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[];
  reviewNote?: string;
}

export interface TeacherCourseItem {
  id: string;
  title: string;
  categoryName: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED";
  rejectionReason?: string;
  suggestedPrice: number;
  totalLessons: number;
  totalStudents: number;
  sections?: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      contentType: "VIDEO" | "TEXT" | "PDF";
      previewType: "FREE" | "LOCKED";
    }[];
  }[];
}

export interface SuggestedClassMatchingItem {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  categoryId: string;
  categoryName: string;
  coursePackageId: string;
  packageName: string;
  includedTutorSessions: number;
  status: string;
  availablePeriod: string;
  availableDays: string;
  preferredTimes: string;
  currentLevel: string;
  learningSituation: string;
  learningGoals: string;
  weakAreas: string;
  instructorPreferences?: string | null;
  additionalNotes?: string | null;
}

export interface FillBlankQuestionItem {
  id: string;
  attemptId: string;
  quizTitle: string;
  studentName: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  maxPoints: number;
  pointsEarned?: number;
}

export interface QuestionDifficultyStat {
  id: string;
  quizTitle: string;
  questionText: string;
  totalAttempts: number;
  errorCount: number;
  errorRatePercent: number;
}

export interface SessionPaymentRecord {
  id: string;
  sessionId: string;
  className: string;
  date: string;
  durationHours: number;
  hourlyRate: number;
  totalAmount: number;
  status: "DRAFT" | "PENDING" | "CONFIRMED" | "PAID" | "CANCELLED" | "DELETE";
  unreviewedSecondsLeft?: number;
}

export interface LeaveRequestRecord {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNPAID" | "CANCELLED";
  createdAt: string;
}

export interface TeacherActivityItem {
  id: string;
  type: "CLASS_STUDENT_JOINED" | "ASSIGNMENT_SUBMITTED" | "QUIZ_SUBMITTED" | "TEACHING_SESSION_COMPLETED" | "SESSION_REVIEWED";
  title: string;
  content: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export const teacherApi = {
  getDashboardMetrics: async (): Promise<TeacherDashboardMetrics> => {
    const res = await httpClient.get<ApiResponse<TeacherDashboardMetrics>>("/v1/teacher/dashboard/metrics");
    return res.data.data;
  },

  getAgenda: async (): Promise<AgendaSessionItem[]> => {
    const res = await httpClient.get<ApiResponse<AgendaSessionItem[]>>("/v1/teacher/dashboard/agenda");
    return res.data.data || [];
  },

  getLatestActivities: async (): Promise<TeacherActivityItem[]> => {
    const res = await httpClient.get<ApiResponse<TeacherActivityItem[]>>("/v1/teacher/dashboard/activities");
    return res.data.data || [];
  },

  getClasses: async (): Promise<TeacherClassCard[]> => {
    const res = await httpClient.get<ApiResponse<TeacherClassCard[]>>("/v1/teacher/classes");
    return res.data.data || [];
  },

  getClassStudents: async (classId: string): Promise<ClassStudentDetail[]> => {
    const res = await httpClient.get<ApiResponse<ClassStudentDetail[]>>(`/v1/teacher/classes/${classId}/students`);
    return res.data.data || [];
  },

  getOnlineSessions: async (): Promise<OnlineClassSession[]> => {
    const res = await httpClient.get<ApiResponse<OnlineClassSession[]>>("/v1/teacher/sessions/online");
    return res.data.data || [];
  },

  submitSessionReview: async (sessionId: string, _attendanceData: any, note: string): Promise<boolean> => {
    await httpClient.post(`/v1/teacher/sessions/${sessionId}/review`, { note });
    return true;
  },
  getCourses: async (): Promise<TeacherCourseItem[]> => {
    const res = await httpClient.get<ApiResponse<any[]>>("/v1/courses");
    return (res.data.data || []).map((course) => ({
      id: String(course.id), title: course.name, categoryName: course.categoryName || "",
      status: course.status, rejectionReason: course.rejectionReason,
      suggestedPrice: Number(course.suggestedPrice || 0), totalLessons: 0,
      totalStudents: Number(course.enrollmentCount || 0),
    }));
  },

  getSuggestedClasses: async (): Promise<SuggestedClassMatchingItem[]> => {
    const res = await httpClient.get<ApiResponse<SuggestedClassMatchingItem[]>>("/v1/instructors/one-on-one/suggestions");
    return res.data.data || [];
  },

  acceptSuggestedClass: async (id: string): Promise<SuggestedClassMatchingItem> => {
    const res = await httpClient.post<ApiResponse<SuggestedClassMatchingItem>>(`/v1/instructors/one-on-one/requests/${id}/accept`);
    return res.data.data;
  },

  getAssignmentSubmissions: async (): Promise<SubmissionItem[]> => {
    const res = await httpClient.get<ApiResponse<SubmissionItem[]>>("/v1/teacher/grading/assignments");
    return res.data.data || [];
  },

  gradeSubmission: async (id: string, score: number, feedback: string): Promise<boolean> => {
    await httpClient.post(`/v1/teacher/grading/assignments/${id}`, { score, feedback });
    return true;
  },

  getFillBlankQuizzes: async (): Promise<FillBlankQuestionItem[]> => {
    const res = await httpClient.get<ApiResponse<FillBlankQuestionItem[]>>("/v1/teacher/grading/quizzes/fill-blank");
    return res.data.data || [];
  },

  gradeFillBlankQuestion: async (id: string, points: number): Promise<boolean> => {
    await httpClient.post(`/v1/teacher/grading/quizzes/fill-blank/${id}`, { points });
    return true;
  },

  getQuestionDifficultyStats: async (): Promise<QuestionDifficultyStat[]> => {
    const res = await httpClient.get<ApiResponse<QuestionDifficultyStat[]>>("/v1/teacher/grading/quizzes/difficulty-stats");
    return res.data.data || [];
  },

  getAtRiskStudents: async (): Promise<AtRiskStudentData[]> => {
    const classes = await teacherApi.getClasses();
    const rows = await Promise.all(classes.map(async (item) => ({
      item,
      students: await teacherApi.getClassStudents(item.id),
    })));
    return rows.flatMap(({ item, students }) => students.filter((student) => student.isAtRisk).map((student) => ({
      id: student.studentId,
      studentName: student.studentName,
      studentEmail: student.studentEmail,
      studentAvatar: student.studentAvatar,
      courseName: item.courseName,
      className: item.className,
      daysInactive: student.daysInactive ?? 0,
      progressPercent: student.progressPercent,
      expectedPercent: student.expectedPercent ?? 0,
      avgQuizScore: student.avgQuizScore,
      riskReason: student.riskReason || "Học viên có tín hiệu chậm tiến độ",
    })));
  },

  sendStudentReminder: async (studentId: string): Promise<boolean> => {
    await httpClient.post(`/v1/teacher/insights/at-risk-students/${studentId}/reminder`);
    return true;
  },

  getEarnings: async (): Promise<SessionPaymentRecord[]> => {
    const res = await httpClient.get<ApiResponse<SessionPaymentRecord[]>>("/v1/teacher/earnings");
    return res.data.data || [];
  },

  getLeaveRequests: async (): Promise<LeaveRequestRecord[]> => {
    const res = await httpClient.get<ApiResponse<LeaveRequestRecord[]>>("/v1/teacher/leave-requests");
    return res.data.data || [];
  },

  createLeaveRequest: async (req: Partial<LeaveRequestRecord>): Promise<LeaveRequestRecord> => {
    const res = await httpClient.post<ApiResponse<LeaveRequestRecord>>("/v1/teacher/leave-requests", {
      leaveType: "OTHER", startDate: req.startDate, endDate: req.endDate, reason: req.reason,
    });
    return res.data.data;
  },

  cancelLeaveRequest: async (id: string): Promise<boolean> => {
    await httpClient.post(`/v1/leave-requests/${id}/cancel`);
    return true;
  },
};
