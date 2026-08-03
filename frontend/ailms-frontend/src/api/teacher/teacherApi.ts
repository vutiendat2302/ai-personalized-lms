import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";
import type { AtRiskStudentData } from "@/components/teacher/StudentRiskRow";
import type { SubmissionItem } from "@/components/teacher/GradingQueueItem";

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
  status: "UPCOMING" | "LIVE" | "UNREVIEWED" | "COMPLETED";
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
  courseName: string;
  categoryName: string;
  classType: "GROUP_CLASS" | "ONE_ON_ONE";
  requestedSchedule?: string;
  remainingSlots: number;
  isExpiringSoon: boolean;
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
  status: "DRAFT" | "PENDING" | "CONFIRMED" | "PAID";
  unreviewedSecondsLeft?: number;
}

export interface LeaveRequestRecord {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// MOCK DATA FALLBACKS
const MOCK_TEACHER_METRICS: TeacherDashboardMetrics = {
  unreviewedSessionsCount: 2,
  unreviewedMinSecondsLeft: 18 * 3600 + 14 * 60, // ~18 hours left
  pendingGradingAssignmentsCount: 5,
  pendingFillBlankQuizzesCount: 3,
  newSuggestedClassesCount: 4,
  atRiskStudentsCount: 3,

  activeClassesCount: 4,
  sessionsThisWeekCompleted: 6,
  sessionsThisWeekTotal: 10,
  averageRating: 4.9,
  estimatedEarningsMonth: 18500000,
};

const MOCK_AGENDA: AgendaSessionItem[] = [
  {
    id: "sess-101",
    className: "Lớp Fullstack Web FS-2026-K1",
    courseName: "Fullstack Web Pro 1-1",
    sessionTime: "19:00 - 21:00 Hôm nay",
    roomUrl: "https://meet.jit.si/ailms-fs2026",
    studentCount: 15,
    status: "UPCOMING",
  },
  {
    id: "sess-102",
    className: "Lớp AI-Specialist-K2",
    courseName: "AI Application Specialist",
    sessionTime: "20:00 - 21:30 Ngày mai",
    roomUrl: "https://meet.jit.si/ailms-ai2026",
    studentCount: 1,
    status: "UPCOMING",
  },
  {
    id: "sess-103",
    className: "Lớp React-Advanced-K9",
    courseName: "Frontend React & Next.js",
    sessionTime: "19:00 - 21:00 Hôm qua",
    roomUrl: "https://meet.jit.si/ailms-react9",
    studentCount: 20,
    status: "UNREVIEWED",
    secondsLeftToReview: 18 * 3600,
  },
];

const MOCK_TEACHER_CLASSES: TeacherClassCard[] = [
  {
    id: "cls-1",
    className: "Lớp Fullstack Web FS-2026-K1",
    courseName: "Fullstack Web Pro 1-1",
    deliveryMode: "GROUP_CLASS",
    currentStudents: 15,
    maxStudents: 20,
    roleInClass: "TEACHER",
    scheduleSummary: "T2 19:00-21:00, T5 19:00-21:00",
    avgProgressPercent: 68,
    status: "ACTIVE",
  },
  {
    id: "cls-2",
    className: "Lớp AI 1-1 Kèm Chuyên Sâu",
    courseName: "AI Application Specialist",
    deliveryMode: "ONE_ON_ONE",
    currentStudents: 1,
    maxStudents: 1,
    roleInClass: "TEACHER",
    scheduleSummary: "T3 20:00-21:30, T7 10:00-11:30",
    avgProgressPercent: 82,
    status: "ACTIVE",
  },
  {
    id: "cls-3",
    className: "Lớp Frontend React K9 (Trợ giảng)",
    courseName: "Frontend React & Next.js",
    deliveryMode: "GROUP_CLASS",
    currentStudents: 22,
    maxStudents: 25,
    roleInClass: "TA",
    scheduleSummary: "T4 19:00-21:00, CN 14:00-16:00",
    avgProgressPercent: 54,
    status: "ACTIVE",
  },
];

const MOCK_CLASS_STUDENTS: ClassStudentDetail[] = [
  {
    id: "cs-1",
    studentId: "usr-101",
    studentName: "Bùi Xuân Huấn",
    studentEmail: "huanrose@ailms.edu.vn",
    studentAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    progressPercent: 78,
    avgQuizScore: 8.5,
    lastAccessedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isAtRisk: false,
  },
  {
    id: "cs-2",
    studentId: "usr-102",
    studentName: "Trần Bảo Nam",
    studentEmail: "baonam.tran@gmail.com",
    studentAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
    progressPercent: 22,
    avgQuizScore: 4.0,
    lastAccessedAt: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
    isAtRisk: true,
    riskReason: "9 ngày không làm bài tập & tiến độ thấp trễ hạn 40%",
  },
  {
    id: "cs-3",
    studentId: "usr-103",
    studentName: "Nguyễn Văn An",
    studentEmail: "an.nguyen@gmail.com",
    studentAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    progressPercent: 15,
    avgQuizScore: 3.5,
    lastAccessedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    isAtRisk: true,
    riskReason: "Bỏ lỡ 3 buổi học trực tuyến liên tiếp",
  },
];

const MOCK_TEACHER_COURSES: TeacherCourseItem[] = [
  {
    id: "crs-101",
    title: "Fullstack Web Pro với Next.js & Spring Boot",
    categoryName: "Lập trình Web",
    status: "ACTIVE",
    suggestedPrice: 4500000,
    totalLessons: 32,
    totalStudents: 142,
    sections: [
      {
        id: "sec-1",
        title: "Chương 1: Kiến trúc RESTful với Spring Boot 3",
        lessons: [
          { id: "les-1", title: "Cấu hình Spring Security 6", contentType: "VIDEO", previewType: "FREE" },
          { id: "les-2", title: "Tích hợp JWT Authentication", contentType: "PDF", previewType: "LOCKED" },
        ],
      },
    ],
  },
  {
    id: "crs-102",
    title: "Xây dựng AI Agent với LangChain & Python",
    categoryName: "Trí tuệ nhân tạo",
    status: "REJECTED",
    rejectionReason: "Mô tả khóa học quá sơ sài, chưa đủ số lượng 5 bài học tiêu chuẩn.",
    suggestedPrice: 5000000,
    totalLessons: 3,
    totalStudents: 0,
  },
];

const MOCK_SUGGESTED_CLASSES: SuggestedClassMatchingItem[] = [
  {
    id: "sug-1",
    courseName: "Fullstack Web Pro 1-1",
    categoryName: "Lập trình Web",
    classType: "ONE_ON_ONE",
    requestedSchedule: "Tối T2-T4 19:30 - 21:00",
    remainingSlots: 1,
    isExpiringSoon: true,
  },
  {
    id: "sug-2",
    courseName: "AI Application Specialist",
    categoryName: "Trí tuệ nhân tạo",
    classType: "GROUP_CLASS",
    remainingSlots: 5,
    isExpiringSoon: false,
  },
];

const MOCK_ASSIGNMENT_SUBMISSIONS: SubmissionItem[] = [
  {
    id: "sub-1",
    studentName: "Trần Bảo Nam",
    studentEmail: "baonam.tran@gmail.com",
    assignmentTitle: "Bài tập 2: Xây dựng JWT Filter Spring Security",
    className: "Lớp Fullstack Web FS-2026-K1",
    submittedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    isLate: true,
    content: "Em gửi bài làm Spring Boot JWT filter qua github link: https://github.com/baonam/spring-jwt-demo",
    maxScore: 10,
  },
  {
    id: "sub-2",
    studentName: "Bùi Xuân Huấn",
    studentEmail: "huanrose@ailms.edu.vn",
    assignmentTitle: "Bài tập 2: Xây dựng JWT Filter Spring Security",
    className: "Lớp Fullstack Web FS-2026-K1",
    submittedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    isLate: false,
    content: "Dạ em đã hoàn thành bài tập JWT Filter có kèm test case đầy đủ.",
    maxScore: 10,
  },
];

const MOCK_FILL_BLANK_ITEMS: FillBlankQuestionItem[] = [
  {
    id: "fb-1",
    attemptId: "att-101",
    quizTitle: "Quiz Chương 1: JPA & Hibernate",
    studentName: "Nguyễn Văn An",
    questionText: "Điền annotation đánh dấu thực thể JPA:",
    studentAnswer: "@Entity",
    correctAnswer: "@Entity",
    maxPoints: 2,
  },
  {
    id: "fb-2",
    attemptId: "att-102",
    quizTitle: "Quiz Chương 1: JPA & Hibernate",
    studentName: "Trần Bảo Nam",
    questionText: "Annotation nào dùng để cấu hình bảng trong MySQL:",
    studentAnswer: "@Table",
    correctAnswer: "@Table",
    maxPoints: 2,
  },
];

const MOCK_DIFFICULTY_STATS: QuestionDifficultyStat[] = [
  {
    id: "qstat-1",
    quizTitle: "Quiz 3: Spring Security 6",
    questionText: "Khái niệm SecurityContextHolder lưu trữ thông tin gì?",
    totalAttempts: 45,
    errorCount: 28,
    errorRatePercent: 62.2,
  },
  {
    id: "qstat-2",
    quizTitle: "Quiz 1: JPA Criteria API",
    questionText: "Phân biệt FetchType.LAZY và FetchType.EAGER trong Hibernate?",
    totalAttempts: 42,
    errorCount: 19,
    errorRatePercent: 45.2,
  },
];

const MOCK_EARNINGS: SessionPaymentRecord[] = [
  {
    id: "pay-1",
    sessionId: "sess-103",
    className: "Lớp React-Advanced-K9",
    date: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0],
    durationHours: 2,
    hourlyRate: 350000,
    totalAmount: 700000,
    status: "DRAFT",
    unreviewedSecondsLeft: 18 * 3600,
  },
  {
    id: "pay-2",
    sessionId: "sess-100",
    className: "Lớp Fullstack Web FS-2026-K1",
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split("T")[0],
    durationHours: 2,
    hourlyRate: 350000,
    totalAmount: 700000,
    status: "CONFIRMED",
  },
  {
    id: "pay-3",
    sessionId: "sess-99",
    className: "Lớp AI 1-1 Kèm Chuyên Sâu",
    date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split("T")[0],
    durationHours: 1.5,
    hourlyRate: 500000,
    totalAmount: 750000,
    status: "PAID",
  },
];

const MOCK_LEAVE_REQUESTS: LeaveRequestRecord[] = [
  {
    id: "lr-1",
    startDate: "2026-08-15",
    endDate: "2026-08-18",
    reason: "Bận lịch công tác cá nhân tại TP.HCM",
    status: "PENDING",
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

export const teacherApi = {
  getDashboardMetrics: async (): Promise<TeacherDashboardMetrics> => {
    try {
      const res = await httpClient.get<ApiResponse<TeacherDashboardMetrics>>("/v1/teacher/dashboard/metrics");
      return res.data?.data || MOCK_TEACHER_METRICS;
    } catch {
      return MOCK_TEACHER_METRICS;
    }
  },

  getAgenda: async (): Promise<AgendaSessionItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<AgendaSessionItem[]>>("/v1/teacher/dashboard/agenda");
      return res.data?.data || MOCK_AGENDA;
    } catch {
      return MOCK_AGENDA;
    }
  },

  getClasses: async (): Promise<TeacherClassCard[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TeacherClassCard[]>>("/v1/teacher/classes");
      return res.data?.data || MOCK_TEACHER_CLASSES;
    } catch {
      return MOCK_TEACHER_CLASSES;
    }
  },

  getClassStudents: async (classId: string): Promise<ClassStudentDetail[]> => {
    try {
      const res = await httpClient.get<ApiResponse<ClassStudentDetail[]>>(`/v1/teacher/classes/${classId}/students`);
      return res.data?.data || MOCK_CLASS_STUDENTS;
    } catch {
      return MOCK_CLASS_STUDENTS;
    }
  },

  getOnlineSessions: async (): Promise<OnlineClassSession[]> => {
    return [
      {
        id: "sess-101",
        classId: "cls-1",
        className: "Lớp Fullstack Web FS-2026-K1",
        courseName: "Fullstack Web Pro 1-1",
        title: "Buổi 12: Thực hành JWT Filter Spring Security",
        startTime: "19:00",
        endTime: "21:00",
        startHour: 19,
        endHour: 21,
        dateStr: "2026-08-03",
        dayOfWeek: 0, // Mon
        roomUrl: "https://meet.jit.si/ailms-fs2026",
        status: "SCHEDULED",
      },
      {
        id: "sess-102",
        classId: "cls-2",
        className: "Lớp AI-Specialist-K2",
        courseName: "AI Application Specialist",
        title: "Buổi 5: Fine-tuning LLM với LoRA",
        startTime: "20:00",
        endTime: "21:30",
        startHour: 20,
        endHour: 21.5,
        dateStr: "2026-08-04",
        dayOfWeek: 1, // Tue
        roomUrl: "https://meet.jit.si/ailms-ai2026",
        status: "SCHEDULED",
      },
      {
        id: "sess-103",
        classId: "cls-3",
        className: "Lớp React-Advanced-K9",
        courseName: "Frontend React & Next.js",
        title: "Buổi 8: Server Actions & React Server Components",
        startTime: "19:00",
        endTime: "21:00",
        startHour: 19,
        endHour: 21,
        dateStr: "2026-08-02",
        dayOfWeek: 6, // Sun
        roomUrl: "https://meet.jit.si/ailms-react9",
        status: "UNREVIEWED",
        secondsLeftToReview: 18 * 3600 + 15 * 60,
      },
      {
        id: "sess-104",
        classId: "cls-1",
        className: "Lớp Fullstack Web FS-2026-K1",
        courseName: "Fullstack Web Pro 1-1",
        title: "Buổi 13: Cấu hình Microservices Eureka & API Gateway",
        startTime: "19:00",
        endTime: "21:00",
        startHour: 19,
        endHour: 21,
        dateStr: "2026-08-06",
        dayOfWeek: 3, // Thu
        roomUrl: "https://meet.jit.si/ailms-fs2026",
        status: "SCHEDULED",
      },
      {
        id: "sess-105",
        classId: "cls-2",
        className: "Lớp AI 1-1 Kèm Chuyên Sâu",
        courseName: "AI Application Specialist",
        title: "Buổi 6: Review Code & Chữa bài tập LangChain",
        startTime: "10:00",
        endTime: "11:30",
        startHour: 10,
        endHour: 11.5,
        dateStr: "2026-08-08",
        dayOfWeek: 5, // Sat
        roomUrl: "https://meet.jit.si/ailms-ai2026",
        status: "SCHEDULED",
      },
    ];
  },

  submitSessionReview: async (sessionId: string, attendanceData: any, note: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/teacher/sessions/${sessionId}/review`, { attendanceData, note });
      return true;
    } catch {
      return true;
    }
  },

  getCourses: async (): Promise<TeacherCourseItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TeacherCourseItem[]>>("/v1/teacher/courses");
      return res.data?.data || MOCK_TEACHER_COURSES;
    } catch {
      return MOCK_TEACHER_COURSES;
    }
  },

  getSuggestedClasses: async (): Promise<SuggestedClassMatchingItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<SuggestedClassMatchingItem[]>>("/v1/teacher/suggested-classes");
      return res.data?.data || MOCK_SUGGESTED_CLASSES;
    } catch {
      return MOCK_SUGGESTED_CLASSES;
    }
  },

  acceptSuggestedClass: async (id: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/teacher/suggested-classes/${id}/accept`);
      return true;
    } catch {
      return true;
    }
  },

  getAssignmentSubmissions: async (): Promise<SubmissionItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<SubmissionItem[]>>("/v1/teacher/grading/assignments");
      return res.data?.data || MOCK_ASSIGNMENT_SUBMISSIONS;
    } catch {
      return MOCK_ASSIGNMENT_SUBMISSIONS;
    }
  },

  gradeSubmission: async (id: string, score: number, feedback: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/teacher/grading/assignments/${id}`, { score, feedback });
      return true;
    } catch {
      return true;
    }
  },

  getFillBlankQuizzes: async (): Promise<FillBlankQuestionItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<FillBlankQuestionItem[]>>("/v1/teacher/grading/quizzes/fill-blank");
      return res.data?.data || MOCK_FILL_BLANK_ITEMS;
    } catch {
      return MOCK_FILL_BLANK_ITEMS;
    }
  },

  gradeFillBlankQuestion: async (id: string, points: number): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/teacher/grading/quizzes/fill-blank/${id}`, { points });
      return true;
    } catch {
      return true;
    }
  },

  getQuestionDifficultyStats: async (): Promise<QuestionDifficultyStat[]> => {
    return MOCK_DIFFICULTY_STATS;
  },

  getAtRiskStudents: async (): Promise<AtRiskStudentData[]> => {
    return MOCK_CLASS_STUDENTS.filter((s) => s.isAtRisk).map((s) => ({
      id: s.id,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      studentAvatar: s.studentAvatar,
      courseName: "Fullstack Web Pro 1-1",
      className: "Lớp FS-2026-K1",
      daysInactive: 9,
      progressPercent: s.progressPercent,
      expectedPercent: 65,
      avgQuizScore: s.avgQuizScore,
      riskReason: s.riskReason || "Chưa làm bài tập 9 ngày",
    }));
  },

  sendStudentReminder: async (studentId: string): Promise<boolean> => {
    return true;
  },

  getEarnings: async (): Promise<SessionPaymentRecord[]> => {
    return MOCK_EARNINGS;
  },

  getLeaveRequests: async (): Promise<LeaveRequestRecord[]> => {
    return MOCK_LEAVE_REQUESTS;
  },

  createLeaveRequest: async (req: Partial<LeaveRequestRecord>): Promise<LeaveRequestRecord> => {
    return {
      id: "lr-" + Date.now(),
      startDate: req.startDate || "2026-08-20",
      endDate: req.endDate || "2026-08-22",
      reason: req.reason || "",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
  },

  cancelLeaveRequest: async (id: string): Promise<boolean> => {
    return true;
  },
};
