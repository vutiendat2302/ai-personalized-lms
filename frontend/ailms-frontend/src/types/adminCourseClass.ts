export type DeliveryMode = "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";
export type CourseStatus = "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "DRAFT" | "INACTIVE";
export type ClassStatus = "OPEN" | "READY" | "CLOSED";
export type RequestType = "CLASS_TRANSFER_REQUEST" | "TEACHER_CHANGE_REQUEST" | "PENDING_MATCHING" | "CLASS_TEACHER_LEAVE_REQUEST";
export type SessionStatus = "COMPLETED" | "UPCOMING" | "CANCELLED";
export type PaymentStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "PAID" | "CANCELLED" | "DELETE";

export interface TeacherInfo {
  id: string;
  name: string;
  avatar: string;
  category: string;
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
  active: boolean;
}

export interface CourseExtended {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  coverImage?: string;
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  status: CourseStatus;
  teachers: TeacherInfo[];
  rating: number;
  reviewCount: number;
  packagesCount: number;
  packages: CoursePackage[];
  referencePrice: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ClassScheduleSlot {
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  startTime: string; // e.g. "18:30"
  endTime: string;   // e.g. "20:30"
}

export interface ClassMember {
  id: string;
  enrollmentId?: string;
  studentId: string;
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

// Initial Mock Data
export const MOCK_COURSES: CourseExtended[] = [
  {
    id: "course-1",
    name: "Lập trình Java Căn Bản & Nâng Cao",
    categoryId: "cat-1",
    categoryName: "Lập Trình Backend",
    description: "Khóa học bài bản từ Java Core, OOP đến Spring Boot RESTful API chuyên sâu.",
    coverImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    level: "BASIC",
    status: "ACTIVE",
    teachers: [
      { id: "t-1", name: "Nguyễn Văn Anh", avatar: "https://i.pravatar.cc/150?u=t1", category: "Lập Trình Backend", rating: 4.9 },
      { id: "t-2", name: "Trần Thị Bình", avatar: "https://i.pravatar.cc/150?u=t2", category: "Lập Trình Backend", rating: 4.8 },
    ],
    rating: 4.85,
    reviewCount: 124,
    packagesCount: 3,
    referencePrice: 3500000,
    createdAt: "2026-01-10",
    packages: [
      { id: "pkg-1", courseId: "course-1", name: "Java Tự Học Basic", price: 1990000, durationDays: 90, deliveryMode: "SELF_STUDY", active: true },
      { id: "pkg-2", courseId: "course-1", name: "Java Lớp Nhóm K12", price: 3500000, durationDays: 60, deliveryMode: "GROUP_CLASS", attachedClassId: "class-101", attachedClassName: "Lớp Java Basic K12", attachedClassCapacity: { current: 8, max: 12 }, active: true },
      { id: "pkg-3", courseId: "course-1", name: "Java 1-on-1 VIP Mentor", price: 7900000, durationDays: 45, deliveryMode: "ONE_ON_ONE", active: true },
    ]
  },
  {
    id: "course-2",
    name: "ReactJS & Next.js Modern Frontend Development",
    categoryId: "cat-2",
    categoryName: "Lập Trình Frontend",
    description: "Xây dựng ứng dụng web hiện đại với React 19, Next.js App Router và TailwindCSS.",
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80",
    level: "INTERMEDIATE",
    status: "ACTIVE",
    teachers: [
      { id: "t-3", name: "Lê Hoàng Cường", avatar: "https://i.pravatar.cc/150?u=t3", category: "Lập Trình Frontend", rating: 4.95 }
    ],
    rating: 4.9,
    reviewCount: 98,
    packagesCount: 2,
    referencePrice: 4200000,
    createdAt: "2026-02-15",
    packages: [
      { id: "pkg-4", courseId: "course-2", name: "React Online Speedrun", price: 2490000, durationDays: 60, deliveryMode: "SELF_STUDY", active: true },
      { id: "pkg-5", courseId: "course-2", name: "React Modern K05", price: 4200000, durationDays: 60, deliveryMode: "GROUP_CLASS", attachedClassId: "class-102", attachedClassName: "Lớp React Modern K05", attachedClassCapacity: { current: 11, max: 12 }, active: true },
    ]
  },
  {
    id: "course-3",
    name: "Python Data Science & Machine Learning Core",
    categoryId: "cat-3",
    categoryName: "Khoa Học Dữ Liệu",
    description: "Phân tích dữ liệu với Pandas, NumPy, Scikit-Learn và trực quan hóa chuyên nghiệp.",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    level: "ADVANCED",
    status: "PENDING_APPROVAL",
    teachers: [
      { id: "t-4", name: "Phạm Minh Đức", avatar: "https://i.pravatar.cc/150?u=t4", category: "Khoa Học Dữ Liệu", rating: 4.7 }
    ],
    rating: 4.7,
    reviewCount: 45,
    packagesCount: 1,
    referencePrice: 5000000,
    createdAt: "2026-07-01",
    packages: [
      { id: "pkg-6", courseId: "course-3", name: "Python Data Science Mastery", price: 5000000, durationDays: 90, deliveryMode: "GROUP_CLASS", active: false }
    ]
  },
  {
    id: "course-4",
    name: "UI/UX Design Systems with Figma",
    categoryId: "cat-4",
    categoryName: "Thiết Kế Đồ Họa",
    description: "Quy trình thiết kế giao diện từ Wireframe, Design System đến Interactive Prototype.",
    coverImage: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=600&q=80",
    level: "BASIC",
    status: "DRAFT",
    teachers: [],
    rating: 0,
    reviewCount: 0,
    packagesCount: 0,
    referencePrice: 2800000,
    createdAt: "2026-07-20",
    packages: []
  }
];

export const MOCK_CLASSES: Classroom[] = [
  {
    id: "class-101",
    code: "JAVA-K12",
    name: "Lớp Java Basic K12",
    courseId: "course-1",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    categoryName: "Lập Trình Backend",
    type: "GROUP_CLASS",
    teacher: { id: "t-1", name: "Nguyễn Văn Anh", avatar: "https://i.pravatar.cc/150?u=t1", category: "Lập Trình Backend" },
    currentCapacity: 8,
    maxCapacity: 12,
    waitlistCount: 3,
    status: "READY",
    startDate: "2026-08-15",
    endDate: "2026-10-15",
    schedule: [
      { dayOfWeek: "MON", startTime: "18:30", endTime: "20:30" },
      { dayOfWeek: "WED", startTime: "18:30", endTime: "20:30" },
    ],
    members: [
      { id: "m-1", studentId: "std-1", studentName: "Đặng Tiến Dũng", avatar: "https://i.pravatar.cc/150?u=std1", joinedAt: "2026-07-10", status: "ACTIVE" },
      { id: "m-2", studentId: "std-2", studentName: "Vũ Hải Yến", avatar: "https://i.pravatar.cc/150?u=std2", joinedAt: "2026-07-12", status: "ACTIVE" },
      { id: "m-3", studentId: "std-3", studentName: "Bùi Hoàng Nam", avatar: "https://i.pravatar.cc/150?u=std3", joinedAt: "2026-07-15", status: "ACTIVE" },
      { id: "m-4", studentId: "std-4", studentName: "Phạm Thu Trang", avatar: "https://i.pravatar.cc/150?u=std4", joinedAt: "2026-07-18", status: "ACTIVE" },
      { id: "m-5", studentId: "std-5", studentName: "Nguyễn Văn Hùng", avatar: "https://i.pravatar.cc/150?u=std5", joinedAt: "2026-07-20", status: "ACTIVE" },
      { id: "m-6", studentId: "std-6", studentName: "Lê Minh Khánh", avatar: "https://i.pravatar.cc/150?u=std6", joinedAt: "2026-07-22", status: "ACTIVE" },
      { id: "m-7", studentId: "std-7", studentName: "Đỗ Phương Thảo", avatar: "https://i.pravatar.cc/150?u=std7", joinedAt: "2026-07-25", status: "ACTIVE" },
      { id: "m-8", studentId: "std-8", studentName: "Trần Đức Long", avatar: "https://i.pravatar.cc/150?u=std8", joinedAt: "2026-07-28", status: "ACTIVE" },
    ],
    waitlist: [
      { id: "w-1", position: 1, studentId: "std-9", studentName: "Hoàng Minh Tâm", avatar: "https://i.pravatar.cc/150?u=std9", waitlistedAt: "2026-07-29 10:15" },
      { id: "w-2", position: 2, studentId: "std-10", studentName: "Ngô Quốc Bảo", avatar: "https://i.pravatar.cc/150?u=std10", waitlistedAt: "2026-07-30 14:20" },
      { id: "w-3", position: 3, studentId: "std-11", studentName: "Phan Ánh Nguyệt", avatar: "https://i.pravatar.cc/150?u=std11", waitlistedAt: "2026-07-31 09:05" },
    ],
    sessions: [
      { id: "s-1", date: "2026-08-15", startTime: "18:30", endTime: "20:30", status: "UPCOMING", teacherName: "Nguyễn Văn Anh", teacherAvatar: "https://i.pravatar.cc/150?u=t1", paymentStatus: "PENDING" },
      { id: "s-2", date: "2026-08-17", startTime: "18:30", endTime: "20:30", status: "UPCOMING", teacherName: "Nguyễn Văn Anh", teacherAvatar: "https://i.pravatar.cc/150?u=t1", paymentStatus: "PENDING" },
    ]
  },
  {
    id: "class-102",
    code: "REACT-K05",
    name: "Lớp React Modern K05",
    courseId: "course-2",
    courseName: "ReactJS & Next.js Modern Frontend Development",
    categoryName: "Lập Trình Frontend",
    type: "GROUP_CLASS",
    teacher: { id: "t-3", name: "Lê Hoàng Cường", avatar: "https://i.pravatar.cc/150?u=t3", category: "Lập Trình Frontend" },
    currentCapacity: 11,
    maxCapacity: 12,
    waitlistCount: 5,
    status: "OPEN",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    schedule: [
      { dayOfWeek: "TUE", startTime: "19:00", endTime: "21:00" },
      { dayOfWeek: "THU", startTime: "19:00", endTime: "21:00" },
    ],
    members: [],
    waitlist: [],
    sessions: [
      { id: "s-10", date: "2026-08-01", startTime: "19:00", endTime: "21:00", status: "COMPLETED", teacherName: "Lê Hoàng Cường", teacherAvatar: "https://i.pravatar.cc/150?u=t3", paymentStatus: "PAID" },
    ]
  },
  {
    id: "class-103",
    code: "JAVA-1ON1-01",
    name: "Lớp Java VIP 1-on-1 (Đỗ Minh)",
    courseId: "course-1",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    categoryName: "Lập Trình Backend",
    type: "ONE_ON_ONE",
    teacher: { id: "t-2", name: "Trần Thị Bình", avatar: "https://i.pravatar.cc/150?u=t2", category: "Lập Trình Backend" },
    currentCapacity: 1,
    maxCapacity: 1,
    waitlistCount: 0,
    status: "OPEN",
    startDate: "2026-08-05",
    endDate: "2026-09-20",
    schedule: [
      { dayOfWeek: "SAT", startTime: "09:00", endTime: "11:00" },
    ],
    members: [
      { id: "m-20", studentId: "std-50", studentName: "Đỗ Minh", avatar: "https://i.pravatar.cc/150?u=std50", joinedAt: "2026-08-01", status: "ACTIVE" }
    ],
    waitlist: [],
    sessions: []
  }
];

export const MOCK_REQUESTS: OperationalRequest[] = [
  {
    id: "req-1",
    type: "CLASS_TRANSFER_REQUEST",
    studentName: "Trần Văn Nam",
    studentAvatar: "https://i.pravatar.cc/150?u=req1",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    oldClassName: "Lớp Java Basic K11",
    oldClassId: "class-100",
    newClassName: "Lớp Java Basic K12",
    newClassId: "class-101",
    reason: "Bận lịch công tác đột xuất vào tối Thứ 3/Thứ 5, muốn chuyển sang lớp K12 học tối Thứ 2/Thứ 4.",
    createdAt: "2026-07-31 16:30",
    targetClassFull: false
  },
  {
    id: "req-2",
    type: "CLASS_TRANSFER_REQUEST",
    studentName: "Nguyễn Thị Hoa",
    studentAvatar: "https://i.pravatar.cc/150?u=req2",
    courseName: "ReactJS & Next.js Modern Frontend Development",
    oldClassName: "Lớp React Modern K04",
    oldClassId: "class-104",
    newClassName: "Lớp React Modern K05",
    newClassId: "class-102",
    reason: "Muốn học cùng nhóm bạn tại lớp K05.",
    createdAt: "2026-08-01 08:00",
    targetClassFull: true
  },
  {
    id: "req-3",
    type: "TEACHER_CHANGE_REQUEST",
    studentName: "Lê Hoàng Yến",
    studentAvatar: "https://i.pravatar.cc/150?u=req3",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    currentTeacherName: "Trần Thị Bình",
    currentTeacherAvatar: "https://i.pravatar.cc/150?u=t2",
    className: "Lớp Java VIP 1-on-1 (Lê Hoàng Yến)",
    classId: "class-103",
    reason: "Học viên mong muốn giáo viên có phong cách giảng dạy tập trung nhiều hơn vào bài tập thực tế Spring Boot Enterprise.",
    createdAt: "2026-07-29 14:00"
  },
  {
    id: "req-4",
    type: "PENDING_MATCHING",
    studentName: "Phạm Quốc Hùng",
    studentAvatar: "https://i.pravatar.cc/150?u=req4",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    desiredSchedule: "Thứ 3 + Thứ 5 (19:30 - 21:30)",
    reason: "Hệ thống chưa tìm được giáo viên phù hợp khung giờ đăng ký 1-on-1.",
    createdAt: "2026-07-24 09:00",
    daysWaiting: 8
  },
  {
    id: "req-5",
    type: "PENDING_MATCHING",
    studentName: "Vũ Thanh Hằng",
    studentAvatar: "https://i.pravatar.cc/150?u=req5",
    courseName: "ReactJS & Next.js Modern Frontend Development",
    desiredSchedule: "Thứ 7 + Chủ Nhật (09:00 - 11:00)",
    reason: "Chờ ghép giáo viên lớp React Advanced Weekend.",
    createdAt: "2026-07-28 11:15",
    daysWaiting: 4
  },
  {
    id: "req-6",
    type: "CLASS_TEACHER_LEAVE_REQUEST",
    studentName: "Giáo viên xin nghỉ",
    studentAvatar: "https://i.pravatar.cc/150?u=t1",
    courseName: "Lập trình Java Căn Bản & Nâng Cao",
    currentTeacherName: "Nguyễn Văn Anh",
    currentTeacherAvatar: "https://i.pravatar.cc/150?u=t1",
    className: "Lớp Java Basic K12",
    classId: "class-101",
    reason: "Sắp đi công tác nghiên cứu sinh tại nước ngoài 3 tuần từ giữa tháng 8. Xin thôi phân công lớp K12.",
    createdAt: "2026-07-30 20:00"
  }
];

export const ALL_TEACHERS: TeacherInfo[] = [
  { id: "t-1", name: "Nguyễn Văn Anh", avatar: "https://i.pravatar.cc/150?u=t1", category: "Lập Trình Backend", rating: 4.9, email: "anh.nguyen@example.com", phone: "0901234567" },
  { id: "t-2", name: "Trần Thị Bình", avatar: "https://i.pravatar.cc/150?u=t2", category: "Lập Trình Backend", rating: 4.8, email: "binh.tran@example.com", phone: "0902345678" },
  { id: "t-3", name: "Lê Hoàng Cường", avatar: "https://i.pravatar.cc/150?u=t3", category: "Lập Trình Frontend", rating: 4.95, email: "cuong.le@example.com", phone: "0903456789" },
  { id: "t-4", name: "Phạm Minh Đức", avatar: "https://i.pravatar.cc/150?u=t4", category: "Khoa Học Dữ Liệu", rating: 4.7, email: "duc.pham@example.com", phone: "0904567890" },
  { id: "t-5", name: "Đặng Kim Liên", avatar: "https://i.pravatar.cc/150?u=t5", category: "Lập Trình Backend", rating: 4.85, email: "lien.dang@example.com", phone: "0905678901" },
  { id: "t-6", name: "Vũ Tiến Đạt", avatar: "https://i.pravatar.cc/150?u=t6", category: "Lập Trình Frontend", rating: 5.0, email: "dat.vu@example.com", phone: "0906789012" },
];
