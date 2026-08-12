import httpClient from "@/api/httpClient";
import type { ApiResponse, PageResponse } from "@/types/base";

export type OrderStatusEnum = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type OrderItemTypeEnum = "NEW_PURCHASE" | "UPGRADE" | "RENEWAL";
export type PaymentMethodEnum = "PAYPAL" | "VNPAY" | "MOMO" | "BANK_TRANSFER" | "MOCK";
export type PaymentStatusEnum = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type DeliveryModeEnum = "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE" | "COMBO";

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
  paypalRefundId?: string | null;
  refundAmount?: number | null;
  refundCurrency?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
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
  minOrderAmount?: number;
}

export interface CoursePackageStats {
  totalPackages: number;
  activePackages: number;
  outOfStockPackages: number;
  inactivePackages: number;
}

export interface CoursePackageItem {
  id: string;
  code?: string;
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
  currentMemberCount?: number;
  maxMembers?: number;
  discountPercentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoursePackageDetail {
  id: string;
  code?: string;
  name: string;
  description?: string;
  courseId: string;
  courseName: string;
  classId?: string;
  className?: string;
  deliveryMode: DeliveryModeEnum;
  price: number;
  originalPrice: number;
  discountPercentage?: number;
  currentMemberCount?: number;
  maxMembers?: number;
  durationDays?: number;
  includedTutorSessions?: number;
  maxGroupSize?: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | number;
  updatedBy?: string | number;
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



/** Map EnrollmentResponse từ backend sang EnrollmentItem cho FE. */
function mapEnrollmentFromBackend(raw: any): EnrollmentItem {
  const statusMap: Record<number, EnrollmentItem["status"]> = {
    0: "ACTIVE",
    1: "COMPLETED",
    2: "EXPIRED",
    3: "DROPPED",
  };
  const status: EnrollmentItem["status"] =
    typeof raw.status === "number" ? statusMap[raw.status] ?? "ACTIVE" : raw.status ?? "ACTIVE";

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

export const salesApi = {
  // 3.1 Dashboard KPI & Analytics
  getSalesKPI: async (): Promise<SalesKPI> => {
    try {
      const res = await httpClient.get<ApiResponse<SalesKPI>>("/v1/sales/dashboard/kpi");
      return (
        res.data?.data || {
          todayRevenue: 0,
          revenueChangePercent: 0,
          pendingOrdersCount: 0,
          isPendingWarning: false,
          conversionRate: 0,
          expiringCouponsCount: 0,
        }
      );
    } catch {
      return {
        todayRevenue: 0,
        revenueChangePercent: 0,
        pendingOrdersCount: 0,
        isPendingWarning: false,
        conversionRate: 0,
        expiringCouponsCount: 0,
      };
    }
  },

  getDailyRevenueStats: async (): Promise<DailyRevenueStat[]> => {
    try {
      const res = await httpClient.get<ApiResponse<DailyRevenueStat[]>>("/v1/sales/dashboard/revenue-chart");
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  getTopCoursePackages: async (): Promise<TopCoursePackageStat[]> => {
    try {
      const res = await httpClient.get<ApiResponse<TopCoursePackageStat[]>>("/v1/sales/dashboard/top-packages");
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  getUrgentTasks: async (): Promise<UrgentTaskItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<UrgentTaskItem[]>>("/v1/sales/dashboard/urgent-tasks");
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  // 3.2 & 3.3 Orders
  getOrders: async (params?: any): Promise<OrderDetail[]> => {
    try {
      const res = await httpClient.get<ApiResponse<OrderDetail[]>>("/v1/orders", { params });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  getOrderById: async (id: string): Promise<OrderDetail | null> => {
    try {
      const res = await httpClient.get<ApiResponse<OrderDetail>>(`/v1/orders/${id}`);
      return res.data?.data || null;
    } catch {
      return null;
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
    try {
      const res = await httpClient.get<ApiResponse<PaymentTransaction[]>>("/v1/payments", { params });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  getPaymentById: async (id: string): Promise<PaymentTransaction | null> => {
    try {
      const res = await httpClient.get<ApiResponse<PaymentTransaction>>(`/v1/payments/${id}`);
      return res.data?.data || null;
    } catch {
      return null;
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
  getCoursePackageStats: async (): Promise<CoursePackageStats> => {
    try {
      const res = await httpClient.get<ApiResponse<CoursePackageStats>>("/v1/course-packages/stats");
      return (
        res.data?.data || {
          totalPackages: 0,
          activePackages: 0,
          outOfStockPackages: 0,
          inactivePackages: 0,
        }
      );
    } catch {
      return {
        totalPackages: 0,
        activePackages: 0,
        outOfStockPackages: 0,
        inactivePackages: 0,
      };
    }
  },

  searchCoursePackages: async (params?: {
    page?: number;
    size?: number;
    keyword?: string;
    status?: string;
    deliveryMode?: string;
    courseId?: string;
    sort?: string | string[];
  }): Promise<{ content: CoursePackageItem[]; totalElements: number; totalPages: number }> => {
    try {
      const res = await httpClient.get<ApiResponse<PageResponse<any>>>("/v1/course-packages/search", { params });
      const data = res.data?.data;
      if (!data) {
        return { content: [], totalElements: 0, totalPages: 1 };
      }
      const rawContent = data.content || [];
      const content: CoursePackageItem[] = rawContent.map((pkg: any) => ({
        id: String(pkg.id),
        code: pkg.code || String(pkg.id),
        name: pkg.name || "",
        courseId: String(pkg.courseId || ""),
        courseName: pkg.courseName || "",
        deliveryMode: pkg.deliveryMode || "SELF_STUDY",
        originalPrice: Number(pkg.originalPrice ?? pkg.price ?? 0),
        sellingPrice: Number(pkg.price ?? 0),
        status: pkg.status || "ACTIVE",
        features: pkg.features || [],
        durationDays: pkg.durationDays,
        includedTutorSessions: pkg.includedTutorSessions,
        maxGroupSize: pkg.maxGroupSize,
        className: pkg.className,
        currentMemberCount: pkg.currentMemberCount,
        maxMembers: pkg.maxMembers,
        discountPercentage: pkg.discountPercentage,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      }));
      return {
        content,
        totalElements: data.totalElements || content.length,
        totalPages: data.totalPages || 1,
      };
    } catch {
      return { content: [], totalElements: 0, totalPages: 1 };
    }
  },

  getCoursePackages: async (): Promise<CoursePackageItem[]> => {
    try {
      const res = await httpClient.get<ApiResponse<CoursePackageItem[]>>("/v1/course-packages");
      return res.data?.data || [];
    } catch {
      return [];
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

  toggleCoursePackageStatus: async (id: string, status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"): Promise<boolean> => {
    try {
      await httpClient.patch(`/v1/course-packages/${id}/status`, { status });
      return true;
    } catch {
      return false;
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
      return res.data?.data || [];
    } catch {
      return [];
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
