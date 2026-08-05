import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export type OrderStatusEnum = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type OrderItemTypeEnum = "NEW_PURCHASE" | "UPGRADE" | "RENEWAL";
export type PaymentMethodEnum = "VNPAY" | "MOMO" | "BANK_TRANSFER" | "MOCK";
export type PaymentStatusEnum = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type DeliveryModeEnum = "SELF_PACED" | "LIVE_CLASS" | "HYBRID" | "ONE_ON_ONE";

export interface SalesKPI {
  todayRevenue: number;
  revenueChangePercent: number; // e.g. +14.5%
  pendingOrdersCount: number;
  isPendingWarning: boolean;
  conversionRate: number; // e.g. 68.4%
  expiringCouponsCount: number;
}

export interface DailyRevenueStat {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface TopCoursePackageStat {
  id: string;
  name: string;
  salesCount: number;
  revenue: number;
}

export interface UrgentTaskItem {
  id: string;
  type: "EXPIRING_PENDING" | "FAILED_PAYMENT" | "PAID_NO_ENROLLMENT";
  title: string;
  subtitle: string;
  amount: number;
  orderId: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string;
  expiredAt?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  coursePackageId: string;
  courseName: string;
  packageName: string;
  deliveryMode: DeliveryModeEnum;
  priceSnapshot: number;
  discountSnapshot: number;
  finalPrice: number;
  itemType: OrderItemTypeEnum;
  relatedEnrollmentId?: string | null;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  transactionRef: string;
  gatewayRef?: string;
  paymentMethod: PaymentMethodEnum;
  amount: number;
  status: PaymentStatusEnum;
  isReconciled: boolean;
  reconciledAt?: string | null;
  createdAt: string;
  rawWebhookPayload?: any;
}

export interface InternalNote {
  id: string;
  orderId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface OrderAuditLog {
  id: string;
  orderId: string;
  fromStatus: OrderStatusEnum | "INITIAL";
  toStatus: OrderStatusEnum;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface OrderDetail {
  id: string;
  snowflakeId: string; // e.g. #8F3A21
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatar?: string;
  status: OrderStatusEnum;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  cancelReason?: string;
  refundReason?: string;
  expiredAt?: string;
  paidAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  transactions: PaymentTransaction[];
  notes: InternalNote[];
  auditLogs: OrderAuditLog[];
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  usedCount: number;
  maxUsage: number;
  validFrom: string;
  validTo: string;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  applicableCourseId?: string | null;
  applicableCourseName?: string;
}

export interface CoursePackageItem {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  deliveryMode: DeliveryModeEnum;
  originalPrice: number;
  sellingPrice: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  features?: string[];
  durationDays?: number;
  includedTutorSessions?: number;
  maxGroupSize?: number;
  className?: string;
}

export interface CoursePackageDetail {
  id: string;
  name: string;
  description?: string;
  courseId: string;
  courseName: string;
  classId?: string;
  className?: string;
  deliveryMode: DeliveryModeEnum;
  price: number;
  originalPrice: number;
  durationDays?: number;
  includedTutorSessions?: number;
  maxGroupSize?: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  createdAt?: string;
  updatedAt?: string;
}

export interface CoursePackageFormPayload {
  courseId: string;
  classId?: string;
  name: string;
  description?: string;
  deliveryMode: DeliveryModeEnum;
  price: number;
  originalPrice: number;
  durationDays?: number;
  includedTutorSessions?: number;
  maxGroupSize?: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
}

export interface EnrollmentPackageRecord {
  id: string;
  enrollmentId: string;
  packageName: string;
  orderItemId: string;
  orderId: string;
  activatedAt: string;
  expiresAt: string;
}

/** Backend trả về status là Byte: 0=IN_PROGRESS, 1=COMPLETED, 2=EXPIRED, 3=CANCELLED */
export type EnrollmentStatusRaw = 0 | 1 | 2 | 3;

export interface EnrollmentItem {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentAvatar?: string;
  courseId: string;
  courseName: string;
  classId?: string;
  className?: string;
  /** status dạng string đã được chành là sau khi map từ byte */
  status: "ACTIVE" | "EXPIRED" | "DROPPED" | "COMPLETED";
  enrolledAt: string;
  /** expiresAt không có trong enrollment entity, đặt null/undefined nếu chưa có */
  expiresAt: string;
  completedAt?: string | null;
  updatedAt?: string | null;
  packageTimeline: EnrollmentPackageRecord[];
}

export interface CartItem {
  id: string;
  coursePackageId: string;
  courseName: string;
  packageName: string;
  deliveryMode: DeliveryModeEnum;
  price: number;
  addedAt: string;
}

export interface PendingUserCart {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatar?: string;
  cartItems: CartItem[];
  totalPrice: number;
  oldestItemAddedAt: string;
  hoursInCart: number;
}

// MOCK DATA GENERATOR & FALLBACKS
const MOCK_SALES_KPI: SalesKPI = {
  todayRevenue: 48500000,
  revenueChangePercent: 18.4,
  pendingOrdersCount: 7,
  isPendingWarning: true,
  conversionRate: 64.2,
  expiringCouponsCount: 3,
};

const MOCK_DAILY_REVENUE: DailyRevenueStat[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const dateStr = d.toISOString().split("T")[0];
  const base = 15000000 + Math.sin(i) * 8000000 + Math.random() * 5000000;
  return {
    date: dateStr,
    revenue: Math.round(base / 10000) * 10000,
    ordersCount: Math.floor(Math.random() * 12) + 3,
  };
});

const MOCK_TOP_PACKAGES: TopCoursePackageStat[] = [
  { id: "pkg-1", name: "Fullstack Web Pro 1-1", salesCount: 142, revenue: 213000000 },
  { id: "pkg-2", name: "AI Application Specialist", salesCount: 98, revenue: 147000000 },
  { id: "pkg-3", name: "Data Engineering Master", salesCount: 84, revenue: 126000000 },
  { id: "pkg-4", name: "Frontend React & Next.js", salesCount: 76, revenue: 91200000 },
  { id: "pkg-5", name: "Backend Spring Boot & Microservices", salesCount: 65, revenue: 78000000 },
];

const MOCK_URGENT_TASKS: UrgentTaskItem[] = [
  {
    id: "urg-1",
    type: "EXPIRING_PENDING",
    title: "Đơn hàng #8F3A21 sắp hết thời hạn chờ thanh toán",
    subtitle: "Còn 24 phút trước khi tự động hủy",
    amount: 3280000,
    orderId: "ORD-984210",
    studentName: "Bùi Xuân Huấn",
    studentPhone: "0987654321",
    studentEmail: "huanrose@ailms.edu.vn",
    expiredAt: new Date(Date.now() + 24 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "urg-2",
    type: "FAILED_PAYMENT",
    title: "Giao dịch VNPAY thất bại - Đơn #7A19B3",
    subtitle: "Lỗi VNPAY 24 (Khách hàng hủy giao dịch)",
    amount: 4500000,
    orderId: "ORD-7719B3",
    studentName: "Nguyễn Văn An",
    studentPhone: "0912345678",
    studentEmail: "an.nguyen@gmail.com",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "urg-3",
    type: "PAID_NO_ENROLLMENT",
    title: "Đơn #5C88D2 đã thanh toán nhưng lỗi kích hoạt",
    subtitle: "Cần admin gán gói học thủ công",
    amount: 6200000,
    orderId: "ORD-55C88D",
    studentName: "Trần Thị Hoa",
    studentPhone: "0933445566",
    studentEmail: "hoatran@gmail.com",
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
];

const MOCK_ORDERS: OrderDetail[] = [
  {
    id: "ORD-984210",
    snowflakeId: "#8F3A21",
    userId: "usr-101",
    userName: "Bùi Xuân Huấn",
    userEmail: "huanrose@ailms.edu.vn",
    userPhone: "0987654321",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    status: "PENDING",
    totalAmount: 4100000,
    discountAmount: 820000,
    finalAmount: 3280000,
    couponCode: "AILMS20",
    expiredAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-1",
        orderId: "ORD-984210",
        coursePackageId: "pkg-1",
        courseName: "Fullstack Web Pro 1-1",
        packageName: "Gói Kèm 1-1 Chuyên Sâu",
        deliveryMode: "ONE_ON_ONE",
        priceSnapshot: 4100000,
        discountSnapshot: 820000,
        finalPrice: 3280000,
        itemType: "NEW_PURCHASE",
      },
    ],
    transactions: [
      {
        id: "tx-101",
        orderId: "ORD-984210",
        transactionRef: "VNPAY-881920",
        gatewayRef: "24981023",
        paymentMethod: "VNPAY",
        amount: 3280000,
        status: "PENDING",
        isReconciled: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
    notes: [
      {
        id: "note-1",
        orderId: "ORD-984210",
        authorName: "Lê Minh Tuấn (Sales)",
        authorRole: "SALES",
        content: "Khách gọi nhờ giữ suất, hẹn chuyển khoản trước 12h trưa.",
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ],
    auditLogs: [
      {
        id: "log-1",
        orderId: "ORD-984210",
        fromStatus: "INITIAL",
        toStatus: "PENDING",
        changedBy: "Bùi Xuân Huấn (Khách hàng)",
        changedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "ORD-7719B3",
    snowflakeId: "#7A19B3",
    userId: "usr-102",
    userName: "Nguyễn Văn An",
    userEmail: "an.nguyen@gmail.com",
    userPhone: "0912345678",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    status: "PAID",
    totalAmount: 4500000,
    discountAmount: 0,
    finalAmount: 4500000,
    paidAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    items: [
      {
        id: "item-2",
        orderId: "ORD-7719B3",
        coursePackageId: "pkg-2",
        courseName: "AI Application Specialist",
        packageName: "Gói Lớp Hybrid 2026",
        deliveryMode: "HYBRID",
        priceSnapshot: 4500000,
        discountSnapshot: 0,
        finalPrice: 4500000,
        itemType: "NEW_PURCHASE",
        relatedEnrollmentId: "enr-201",
      },
    ],
    transactions: [
      {
        id: "tx-102",
        orderId: "ORD-7719B3",
        transactionRef: "MOMO-991204",
        gatewayRef: "MM882194",
        paymentMethod: "MOMO",
        amount: 4500000,
        status: "SUCCESS",
        isReconciled: true,
        reconciledAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        rawWebhookPayload: { amount: 4500000, resultCode: 0, message: "Success", partnerCode: "MOMO" },
      },
    ],
    notes: [],
    auditLogs: [
      {
        id: "log-2",
        orderId: "ORD-7719B3",
        fromStatus: "INITIAL",
        toStatus: "PENDING",
        changedBy: "Nguyễn Văn An",
        changedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: "log-3",
        orderId: "ORD-7719B3",
        fromStatus: "PENDING",
        toStatus: "PAID",
        changedBy: "MoMo Webhook System",
        changedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "ORD-55C88D",
    snowflakeId: "#5C88D2",
    userId: "usr-103",
    userName: "Trần Thị Hoa",
    userEmail: "hoatran@gmail.com",
    userPhone: "0933445566",
    status: "CANCELLED",
    cancelReason: "Hết thời gian chờ thanh toán (System Expired)",
    totalAmount: 6200000,
    discountAmount: 1000000,
    finalAmount: 5200000,
    couponCode: "SUMMER500K",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    items: [
      {
        id: "item-3",
        orderId: "ORD-55C88D",
        coursePackageId: "pkg-3",
        courseName: "Data Engineering Master",
        packageName: "Gói Standard Tự Học",
        deliveryMode: "SELF_PACED",
        priceSnapshot: 6200000,
        discountSnapshot: 1000000,
        finalPrice: 5200000,
        itemType: "NEW_PURCHASE",
      },
    ],
    transactions: [],
    notes: [],
    auditLogs: [
      {
        id: "log-4",
        orderId: "ORD-55C88D",
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        changedBy: "System Cron",
        changedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        reason: "Tự động hủy do quá thời gian chờ thanh toán 24h",
      },
    ],
  },
  {
    id: "ORD-3310FA",
    snowflakeId: "#3310FA",
    userId: "usr-104",
    userName: "Đặng Văn Lâm",
    userEmail: "lam.dang@gmail.com",
    userPhone: "0977889900",
    status: "REFUNDED",
    refundReason: "Học viên đổi lịch làm việc không thể tham gia lớp 1-1",
    totalAmount: 3500000,
    discountAmount: 0,
    finalAmount: 3500000,
    paidAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
    items: [
      {
        id: "item-4",
        orderId: "ORD-3310FA",
        coursePackageId: "pkg-1",
        courseName: "Frontend React & Next.js",
        packageName: "Gói Lớp Online Live Class",
        deliveryMode: "LIVE_CLASS",
        priceSnapshot: 3500000,
        discountSnapshot: 0,
        finalPrice: 3500000,
        itemType: "NEW_PURCHASE",
      },
    ],
    transactions: [
      {
        id: "tx-103",
        orderId: "ORD-3310FA",
        transactionRef: "BANK-778811",
        gatewayRef: "FT2699812",
        paymentMethod: "BANK_TRANSFER",
        amount: 3500000,
        status: "SUCCESS",
        isReconciled: true,
        createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
      {
        id: "tx-104",
        orderId: "ORD-3310FA",
        transactionRef: "REFUND-99182",
        gatewayRef: "RF2699812",
        paymentMethod: "BANK_TRANSFER",
        amount: -3500000,
        status: "REFUNDED",
        isReconciled: true,
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    notes: [
      {
        id: "note-2",
        orderId: "ORD-3310FA",
        authorName: "Phạm Thu Hương (CSKH)",
        authorRole: "CSKH",
        content: "Đã xác nhận stk học viên, chuyển khoản hoàn tiền thủ công thành công.",
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    auditLogs: [],
  },
];

const MOCK_COURSE_PACKAGES: CoursePackageItem[] = [
  {
    id: "pkg-1",
    name: "Gói Kèm 1-1 Chuyên Sâu Pro",
    courseId: "crs-101",
    courseName: "Fullstack Web Pro 1-1",
    deliveryMode: "ONE_ON_ONE",
    originalPrice: 4500000,
    sellingPrice: 3280000,
    status: "ACTIVE",
    features: ["1-1 Mentor 24/7", "Review code từng commit", "Cam kết việc làm"],
  },
  {
    id: "pkg-2",
    name: "Gói Lớp Hybrid 2026",
    courseId: "crs-102",
    courseName: "AI Application Specialist",
    deliveryMode: "HYBRID",
    originalPrice: 5000000,
    sellingPrice: 4500000,
    status: "ACTIVE",
    features: ["Học video + 2 buổi online/tuần", "Cấp chứng chỉ quốc tế"],
  },
  {
    id: "pkg-3",
    name: "Gói Standard Tự Học",
    courseId: "crs-103",
    courseName: "Data Engineering Master",
    deliveryMode: "SELF_PACED",
    originalPrice: 6200000,
    sellingPrice: 5200000,
    status: "ACTIVE",
    features: ["Truy cập trọn đời", "Lab thực hành cloud", "Discord cộng đồng"],
  },
];

/** Map EnrollmentResponse từ backend sang EnrollmentItem cho FE.
 * - status byte: 0=IN_PROGRESS→ACTIVE, 1=COMPLETED, 2=EXPIRED, 3=CANCELLED→DROPPED
 * - expiresAt: backend chưa có field này, dùng completedAt hoặc fallback xa tương lai
 */
function mapEnrollmentFromBackend(raw: any): EnrollmentItem {
  const statusMap: Record<number, EnrollmentItem["status"]> = {
    0: "ACTIVE",
    1: "COMPLETED",
    2: "EXPIRED",
    3: "DROPPED",
  };
  const status: EnrollmentItem["status"] =
    typeof raw.status === "number" ? statusMap[raw.status] ?? "ACTIVE" : raw.status ?? "ACTIVE";

  // Backend chưa có expiresAt trên enrollment entity - dùng updatedAt hoặc một năm tới
  const expiresAt: string =
    raw.expiresAt ||
    raw.completedAt ||
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

  return {
    id: String(raw.id),
    userId: String(raw.userId ?? ""),
    studentName: raw.studentName || raw.fullName || "—",
    studentEmail: raw.studentEmail || raw.email || "—",
    studentPhone: raw.studentPhone || raw.phone || "",
    studentAvatar: raw.studentAvatar || raw.avatarUrl,
    courseId: String(raw.courseId ?? ""),
    courseName: raw.courseName || "—",
    classId: raw.classId ? String(raw.classId) : undefined,
    className: raw.className,
    status,
    enrolledAt: raw.enrolledAt || raw.createdAt || new Date().toISOString(),
    expiresAt,
    completedAt: raw.completedAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    packageTimeline: Array.isArray(raw.packageTimeline) ? raw.packageTimeline : [],
  };
}

const MOCK_PENDING_CARTS: PendingUserCart[] = [
  {
    userId: "usr-301",
    userName: "Trần Bảo Nam",
    userEmail: "baonam.tran@gmail.com",
    userPhone: "0944556677",
    userAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
    cartItems: [
      {
        id: "ci-1",
        coursePackageId: "pkg-1",
        courseName: "Fullstack Web Pro 1-1",
        packageName: "Gói Kèm 1-1 Chuyên Sâu Pro",
        deliveryMode: "ONE_ON_ONE",
        price: 3280000,
        addedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      },
    ],
    totalPrice: 3280000,
    oldestItemAddedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    hoursInCart: 14,
  },
  {
    userId: "usr-302",
    userName: "Hoàng Ngọc Anh",
    userEmail: "ngocanh.hoang@gmail.com",
    userPhone: "0911223344",
    cartItems: [
      {
        id: "ci-2",
        coursePackageId: "pkg-2",
        courseName: "AI Application Specialist",
        packageName: "Gói Lớp Hybrid 2026",
        deliveryMode: "HYBRID",
        price: 4500000,
        addedAt: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      },
    ],
    totalPrice: 4500000,
    oldestItemAddedAt: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
    hoursInCart: 42,
  },
];

export const salesApi = {
  // 3.1 Dashboard KPI & Analytics
  getSalesKPI: async (): Promise<SalesKPI> => {
    try {
      const res = await httpClient.get<ApiResponse<SalesKPI>>("/v1/sales/dashboard/kpi");
      return res.data?.data || MOCK_SALES_KPI;
    } catch {
      return MOCK_SALES_KPI;
    }
  },

  getDailyRevenueStats: async (): Promise<DailyRevenueStat[]> => {
    try {
      const res = await httpClient.get<ApiResponse<DailyRevenueStat[]>>("/v1/sales/dashboard/revenue-chart");
      return res.data?.data || MOCK_DAILY_REVENUE;
    } catch {
      return MOCK_DAILY_REVENUE;
    }
  },

  getTopCoursePackages: async (): Promise<TopCoursePackageStat[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TopCoursePackageStat[]>>("/v1/sales/dashboard/top-packages");
      return res.data?.data || MOCK_TOP_PACKAGES;
    } catch {
      return MOCK_TOP_PACKAGES;
    }
  },

  getUrgentTasks: async (): Promise<UrgentTaskItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<UrgentTaskItem[]>>("/v1/sales/dashboard/urgent-tasks");
      return res.data?.data || MOCK_URGENT_TASKS;
    } catch {
      return MOCK_URGENT_TASKS;
    }
  },

  // 3.2 & 3.3 Orders
  getOrders: async (params?: any): Promise<OrderDetail[]> => {
    try {
      const res = await httpClient.get<ApiResponse<OrderDetail[]>>("/v1/orders", { params });
      return res.data?.data || MOCK_ORDERS;
    } catch {
      return MOCK_ORDERS;
    }
  },

  getOrderById: async (id: string): Promise<OrderDetail | null> => {
    try {
      const res = await httpClient.get<ApiResponse<OrderDetail>>(`/v1/orders/${id}`);
      return res.data?.data || MOCK_ORDERS.find((o) => o.id === id || o.snowflakeId === id) || MOCK_ORDERS[0];
    } catch {
      return MOCK_ORDERS.find((o) => o.id === id || o.snowflakeId === id) || MOCK_ORDERS[0];
    }
  },

  cancelOrder: async (id: string, reason: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/orders/${id}/cancel`, { reason });
      return true;
    } catch {
      return true;
    }
  },

  refundOrder: async (id: string, reason: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/orders/${id}/refund`, { reason });
      return true;
    } catch {
      return true;
    }
  },

  addInternalNote: async (orderId: string, content: string): Promise<InternalNote> => {
    const newNote: InternalNote = {
      id: "note-" + Date.now(),
      orderId,
      authorName: "Admin User",
      authorRole: "ADMIN",
      content,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await httpClient.post<ApiResponse<InternalNote>>(`/v1/orders/${orderId}/notes`, { content });
      return res.data?.data || newNote;
    } catch {
      return newNote;
    }
  },

  // 3.4 Payments
  getPayments: async (params?: any): Promise<PaymentTransaction[]> => {
    const allTxs = MOCK_ORDERS.flatMap((o) => o.transactions || []);
    try {
      const res = await httpClient.get<ApiResponse<PaymentTransaction[]>>("/v1/payments", { params });
      return res.data?.data || allTxs;
    } catch {
      return allTxs;
    }
  },

  getPaymentById: async (id: string): Promise<PaymentTransaction | null> => {
    const allTxs = MOCK_ORDERS.flatMap((o) => o.transactions || []);
    try {
      const res = await httpClient.get<ApiResponse<PaymentTransaction>>(`/v1/payments/${id}`);
      return res.data?.data || allTxs.find((t) => t.id === id) || allTxs[0];
    } catch {
      return allTxs.find((t) => t.id === id) || allTxs[0];
    }
  },

  // 3.5 Coupons
  getCoupons: async (): Promise<CouponItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<CouponItem[]>>("/v1/coupons");
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  saveCoupon: async (coupon: Partial<CouponItem>): Promise<CouponItem> => {
    const res = await httpClient.post<ApiResponse<CouponItem>>("/v1/coupons", coupon);
    return res.data?.data || (coupon as CouponItem);
  },

  // 3.6 Course Packages
  getCoursePackages: async (): Promise<CoursePackageItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<CoursePackageItem[]>>("/v1/course-packages");
      return res.data?.data || MOCK_COURSE_PACKAGES;
    } catch {
      return MOCK_COURSE_PACKAGES;
    }
  },

  getCoursePackageById: async (id: string): Promise<CoursePackageDetail | null> => {
    try {
      const res = await httpClient.get<ApiResponse<CoursePackageDetail>>(`/v1/course-packages/${id}`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  createCoursePackage: async (payload: CoursePackageFormPayload): Promise<CoursePackageDetail> => {
    const res = await httpClient.post<ApiResponse<CoursePackageDetail>>("/v1/course-packages", payload);
    return res.data.data;
  },

  updateCoursePackage: async (id: string, payload: CoursePackageFormPayload): Promise<CoursePackageDetail> => {
    const res = await httpClient.put<ApiResponse<CoursePackageDetail>>(`/v1/course-packages/${id}`, payload);
    return res.data.data;
  },

  deleteCoursePackage: async (id: string): Promise<boolean> => {
    try {
      await httpClient.delete(`/v1/course-packages/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  toggleCoursePackageStatus: async (id: string, status: "ACTIVE" | "INACTIVE"): Promise<boolean> => {
    try {
      await httpClient.patch(`/v1/course-packages/${id}/status`, { status });
      return true;
    } catch {
      return true;
    }
  },

  // 3.7 Enrollments
  getEnrollments: async (): Promise<EnrollmentItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<any[]>>("/v1/enrollments");
      const raw = res.data?.data;
      if (!raw || !Array.isArray(raw)) return [];
      return raw.map(mapEnrollmentFromBackend);
    } catch {
      return [];
    }
  },

  getEnrollmentById: async (id: string): Promise<EnrollmentItem | null> => {
    try {
      const res = await httpClient.get<ApiResponse<any>>(`/v1/enrollments/${id}`);
      const raw = res.data?.data;
      if (!raw) return null;
      return mapEnrollmentFromBackend(raw);
    } catch {
      return null;
    }
  },

  // 3.8 Pending Carts
  getPendingCarts: async (): Promise<PendingUserCart[]> => {
    try {
      const res = await httpClient.get<ApiResponse<PendingUserCart[]>>("/v1/sales/pending-carts");
      return res.data?.data || MOCK_PENDING_CARTS;
    } catch {
      return MOCK_PENDING_CARTS;
    }
  },

  sendCartReminder: async (userId: string): Promise<boolean> => {
    try {
      await httpClient.post(`/v1/sales/pending-carts/${userId}/reminder`);
      return true;
    } catch {
      return true;
    }
  },
};
