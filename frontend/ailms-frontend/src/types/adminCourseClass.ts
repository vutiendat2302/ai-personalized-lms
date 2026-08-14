export type DeliveryMode = "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";
export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type CourseStatus = "DRAFT" | "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE" | "DELETED";
export type ClassStatus = "OPEN" | "READY" | "CLOSED";
export type RequestType = "CLASS_TRANSFER_REQUEST" | "TEACHER_CHANGE_REQUEST" | "PENDING_MATCHING" | "CLASS_TEACHER_LEAVE_REQUEST";
export type SessionStatus = "COMPLETED" | "UPCOMING" | "CANCELLED";
export type PaymentStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "PAID" | "CANCELLED" | "DELETE";

export interface TeacherInfo {
  id: string;
  name: string;
  avatar: string;
  category: string;
  isPrimary?: boolean;
  status?: "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE";
  rating?: number;
  phone?: string;
  email?: string;
}

export interface CoursePackage {
  id: string;
  courseId: string;
  name: string;
  price: number;
  durationDays: number;
  deliveryMode: DeliveryMode;
  attachedClassId?: string;
  attachedClassName?: string;
  attachedClassCapacity?: { current: number; max: number };
  currentMemberCount?: number;
  maxMembers?: number;
  active: boolean;
}

export interface CourseExtended {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  coverImage?: string;
  level: CourseLevel;
  status: CourseStatus;
  teachers: TeacherInfo[];
  rating: number;
  reviewCount: number;
  packagesCount: number;
  packages: CoursePackage[];
  referencePrice: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string | number;
}

export interface ClassScheduleSlot {
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  startTime: string;
  endTime: string;
}

export interface ClassMember {
  id: string;
  enrollmentId?: string;
  studentId: string;
  studentCode?: string;
  studentName: string;
  avatar: string;
  joinedAt: string;
  status: "ACTIVE" | "TRANSFERRED" | "REMOVED";
}

export interface WaitlistEntry {
  id: string;
  position: number;
  studentId: string;
  studentName: string;
  avatar: string;
  waitlistedAt: string;
}

export interface ClassSessionLog {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  teacherName: string;
  teacherAvatar: string;
  paymentStatus: PaymentStatus;
  title?: string;
  meetingUrl?: string;
  amount?: number;
  actualDurationMin?: number;
  cancellationReason?: string;
  scheduledAt?: string;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  courseId: string;
  courseName: string;
  categoryName: string;
  type: "GROUP_CLASS" | "ONE_ON_ONE";
  teacher: TeacherInfo;
  currentCapacity: number;
  maxCapacity: number;
  waitlistCount: number;
  status: ClassStatus;
  startDate: string;
  endDate: string;
  startDateRaw?: string;
  endDateRaw?: string;
  schedule: ClassScheduleSlot[];
  members: ClassMember[];
  waitlist: WaitlistEntry[];
  sessions: ClassSessionLog[];
}

export interface OperationalRequest {
  id: string;
  type: RequestType;
  studentName: string;
  studentAvatar: string;
  courseName: string;
  oldClassName?: string;
  newClassName?: string;
  oldClassId?: string;
  newClassId?: string;
  currentTeacherName?: string;
  currentTeacherAvatar?: string;
  classId?: string;
  className?: string;
  desiredSchedule?: string;
  reason: string;
  createdAt: string;
  daysWaiting?: number;
  targetClassFull?: boolean;
}
