import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type OrderItemType = "NEW_PURCHASE" | "UPGRADE" | "RENEWAL";
export type PaymentMethod = "PAYPAL" | "MOMO" | "VNPAY" | "BANK_TRANSFER";
export type DiscountType = "PERCENT" | "FIXED";

export interface CartItem {
  id: string | number;
  coursePackageId: string | number;
  courseId: string | number;
  courseName: string;
  categoryName?: string;
  image?: string;
  packageName: string;
  deliveryMode: "SELF_STUDY" | "GROUP_CLASS" | "ONE_ON_ONE";
  price: number;
}

export interface OrderItemRequest {
  coursePackageId: string | number;
  itemType?: OrderItemType;
  relatedEnrollmentId?: string | number | null;
  oneOnOneNeeds?: OneOnOneNeedsPayload;
}

export interface CreateOrderRequest {
  items: OrderItemRequest[];
  couponCode?: string;
}

export interface OneOnOneNeedsPayload {
  availablePeriod: string;
  availableDays: string;
  preferredTimes: string;
  currentLevel: string;
  learningSituation: string;
  learningGoals: string;
  weakAreas: string;
  instructorPreferences?: string;
  additionalNotes?: string;
}

export interface CheckoutPaymentResponse {
  orderId: string;
  paymentTransactionId: string;
  payUrl: string;
}

export interface TutorScheduleCheckResponse {
  conflict: boolean;
  message?: string | null;
}

export interface OrderStatusResponse {
  orderId: string;
  orderStatus: OrderStatus;
  paymentTransactionId?: string | null;
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | null;
}

export interface OrderItemResponse {
  id: string;
  orderId: string;
  coursePackageId: string;
  courseName: string;
  packageName: string;
  priceSnapshot: number;
  discountSnapshot: number;
  finalPrice: number;
  itemType: OrderItemType;
}

export interface PaymentTransactionResponse {
  id: string;
  orderId: string;
  transactionRef: string;
  paymentMethod: PaymentMethod;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  amount: number;
  paidAt?: string | null;
  paypalRefundId?: string | null;
  refundAmount?: number | null;
  refundCurrency?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
  createdAt: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  paidAt?: string | null;
  createdAt: string;
  items: OrderItemResponse[];
  transactions?: PaymentTransactionResponse[];
}

export interface CouponResponse {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number; // e.g. 20 for 20% or 500000 for 500k
  usedCount: number;
  maxUsage: number | null;
  validFrom: string;
  validTo: string;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  applicableCourseId?: string | null;
  applicableCourseName?: string;
  applicableCourseIds?: string[];
  applicableCourseNames?: string[];
  distributionScope?: "NONE" | "ALL_STUDENTS" | "SELECTED_STUDENTS";
}

export interface ValidateCouponRequest {
  code: string;
  courseId?: string | number;
  totalAmount?: number;
}

export interface CreateCouponRequest {
  code: string;
  discountType: DiscountType;
  value: number;
  maxUsage: number | null;
  validFrom: string;
  validTo: string;
  applicableCourseId?: string | number | null;
  applicableCourseIds?: string[];
  distributionScope?: "NONE" | "ALL_STUDENTS" | "SELECTED_STUDENTS";
  status?: "ACTIVE" | "DISABLED";
}

/** Chuẩn hóa coupon backend sang model UI đang dùng value/status. */
const normalizeCoupon = (coupon: Omit<CouponResponse, "status"> & { discountValue?: number; status?: string }): CouponResponse => ({
  ...coupon,
  value: coupon.discountValue ?? coupon.value,
  status: coupon.status === "INACTIVE" ? "DISABLED" : (coupon.status as CouponResponse["status"]),
});

export const orderApi = {
  /** Kiểm tra lịch 1-1 mong muốn với các lớp hiện tại mà chưa tạo đơn hàng. */
  checkTutorScheduleConflict: async (oneOnOneNeeds: OneOnOneNeedsPayload): Promise<TutorScheduleCheckResponse> => {
    const response = await httpClient.post<ApiResponse<TutorScheduleCheckResponse>>(
      "/v1/orders/tutor-schedule/check",
      oneOnOneNeeds,
    );
    return response.data.data;
  },

  /** Tạo checkout trực tiếp và nhận approval URL PayPal Sandbox từ backend. */
  checkoutCoursePackage: async (
    coursePackageId: string,
    oneOnOneNeeds?: OneOnOneNeedsPayload,
    acceptScheduleConflict = false,
  ): Promise<CheckoutPaymentResponse> => {
    const response = await httpClient.post<ApiResponse<CheckoutPaymentResponse>>("/v1/orders/checkout", {
      coursePackageId,
      oneOnOneNeeds,
      acceptScheduleConflict,
    });
    return response.data.data;
  },

  /** Tạo một PayPal checkout cho các gói đang chọn trong giỏ hàng. */
  checkoutCart: async (
    items: Array<{ coursePackageId: string; oneOnOneNeeds?: OneOnOneNeedsPayload }>,
    couponCode?: string,
    acceptScheduleConflict = false,
  ): Promise<CheckoutPaymentResponse> => {
    const response = await httpClient.post<ApiResponse<CheckoutPaymentResponse>>("/v1/orders/checkout", {
      items: items.map((item) => ({ ...item, itemType: "NEW_PURCHASE" })),
      couponCode: couponCode || undefined,
      acceptScheduleConflict,
    });
    return response.data.data;
  },

  /** Tạo lại approval URL cho order PENDING sau khi PayPal bị hủy hoặc mất kết nối. */
  retryPaypalPayment: async (orderId: string): Promise<CheckoutPaymentResponse> => {
    const response = await httpClient.post<ApiResponse<CheckoutPaymentResponse>>("/v1/payments/paypal/create", null, {
      params: { orderId },
    });
    return response.data.data;
  },

  /** Capture server-side order đã được PayPal phê duyệt. */
  capturePaypalPayment: async (orderId: string): Promise<OrderStatusResponse> => {
    const response = await httpClient.post<ApiResponse<OrderStatusResponse>>("/v1/payments/paypal/capture", null, {
      params: { orderId },
    });
    return response.data.data;
  },

  /** Lấy trạng thái server-side sau khi trình duyệt quay lại từ PayPal. */
  getOrderStatus: async (orderId: string): Promise<OrderStatusResponse> => {
    const response = await httpClient.get<ApiResponse<OrderStatusResponse>>(`/v1/orders/${orderId}/status`);
    return response.data.data;
  },
  // Cart Endpoints
  getCart: () =>
    httpClient.get<ApiResponse<CartItem[]>>("/v1/cart"),

  addToCart: (coursePackageId: string | number) =>
    httpClient.post<ApiResponse<CartItem>>("/v1/cart/items", { coursePackageId }),

  removeFromCart: (cartItemId: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/cart/items/${cartItemId}`),

  clearCart: () =>
    httpClient.delete<ApiResponse<void>>("/v1/cart/clear"),

  // Coupon Endpoints
  validateCoupon: (payload: ValidateCouponRequest) =>
    httpClient.post<ApiResponse<{
      valid: boolean;
      discountAmount: number;
      finalAmount: number;
      coupon: CouponResponse;
      message?: string;
    }>>("/v1/coupons/validate", payload),

  getCoupons: async (params?: Record<string, string | number>) => {
    const response = await httpClient.get<ApiResponse<CouponResponse[]>>("/v1/coupons", { params });
    return { ...response, data: { ...response.data, data: (response.data.data || []).map(normalizeCoupon) } };
  },

  createCoupon: async (payload: CreateCouponRequest) => {
    const response = await httpClient.post<ApiResponse<CouponResponse>>("/v1/coupons", {
      code: payload.code.trim().toUpperCase(),
      discountType: payload.discountType,
      discountValue: payload.value,
      maxUsage: payload.maxUsage,
      validFrom: `${payload.validFrom}T00:00:00`,
      validTo: `${payload.validTo}T23:59:59`,
      applicableCourseId: payload.applicableCourseId || null,
      applicableCourseIds: payload.applicableCourseIds || [],
      distributionScope: payload.distributionScope || "NONE",
      status: payload.status === "DISABLED" ? "INACTIVE" : "ACTIVE",
    });
    return { ...response, data: { ...response.data, data: normalizeCoupon(response.data.data) } };
  },

  updateCoupon: async (id: string, payload: CreateCouponRequest) => {
    const response = await httpClient.put<ApiResponse<CouponResponse>>(`/v1/coupons/${id}`, {
      code: payload.code.trim().toUpperCase(),
      discountType: payload.discountType,
      discountValue: payload.value,
      maxUsage: payload.maxUsage,
      validFrom: `${payload.validFrom}T00:00:00`,
      validTo: `${payload.validTo}T23:59:59`,
      applicableCourseId: payload.applicableCourseId || null,
      applicableCourseIds: payload.applicableCourseIds || [],
      distributionScope: payload.distributionScope || "NONE",
      status: payload.status === "DISABLED" ? "INACTIVE" : "ACTIVE",
    });
    return { ...response, data: { ...response.data, data: normalizeCoupon(response.data.data) } };
  },

  assignCouponToUser: (couponId: string, userId: string) =>
    httpClient.post<ApiResponse<unknown>>(`/v1/coupons/${couponId}/users/${userId}`),

  assignCouponToAllStudents: (couponId: string) =>
    httpClient.post<ApiResponse<number>>(`/v1/coupons/${couponId}/students`),

  /** Gửi voucher cho nhiều học viên được chọn. */
  assignCouponToUsers: (couponId: string, userIds: string[]) =>
    httpClient.post<ApiResponse<number>>(`/v1/coupons/${couponId}/students/bulk`, userIds),

  deleteCoupon: (id: string | number) =>
    httpClient.delete<ApiResponse<void>>(`/v1/coupons/${id}`),

  // Order Endpoints
  createOrder: (payload: CreateOrderRequest) =>
    httpClient.post<ApiResponse<OrderResponse>>("/v1/orders", payload),

  getOrderById: (id: string | number) =>
    httpClient.get<ApiResponse<OrderResponse>>(`/v1/orders/${id}`),

  getOrders: (params?: any) =>
    httpClient.get<ApiResponse<OrderResponse[]>>("/v1/orders", { params }),

  cancelOrder: (id: string | number) =>
    httpClient.post<ApiResponse<OrderResponse>>(`/v1/orders/${id}/cancel`),

  refundOrder: (id: string | number, reason: string) =>
    httpClient.post<ApiResponse<OrderResponse>>(`/v1/orders/${id}/refund`, { reason }),

  /** Tải hóa đơn PDF cho màn hình quản lý đơn hàng. */
  downloadInvoice: async (id: string | number): Promise<Blob> =>
    (await httpClient.get(`/v1/orders/${id}/invoice.pdf`, { responseType: "blob" })).data,

};
