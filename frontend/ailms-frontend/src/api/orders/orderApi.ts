import httpClient from "@/api/httpClient";
import type { ApiResponse } from "@/types/base";

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
export type OrderItemType = "NEW_PURCHASE" | "UPGRADE" | "RENEWAL";
export type PaymentMethod = "VNPAY" | "MOMO" | "BANK_TRANSFER" | "MOCK";
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
}

export interface CreateOrderRequest {
  items: OrderItemRequest[];
  couponCode?: string;
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
  status: "PENDING" | "SUCCESS" | "FAILED";
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
  maxUsage: number;
  validFrom: string;
  validTo: string;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  applicableCourseId?: string | null;
  applicableCourseName?: string;
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
  maxUsage: number;
  validFrom: string;
  validTo: string;
  applicableCourseId?: string | number | null;
}

export const orderApi = {
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

  getCoupons: (params?: any) =>
    httpClient.get<ApiResponse<CouponResponse[]>>("/v1/coupons", { params }),

  createCoupon: (payload: CreateCouponRequest) =>
    httpClient.post<ApiResponse<CouponResponse>>("/v1/coupons", payload),

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

  // Payment Webhook / Transaction simulation
  initiatePayment: (orderId: string | number, paymentMethod: PaymentMethod) =>
    httpClient.post<ApiResponse<PaymentTransactionResponse>>(`/v1/payments/initiate`, { orderId, paymentMethod }),

  simulateWebhook: (transactionRef: string, status: "SUCCESS" | "FAILED") =>
    httpClient.post<ApiResponse<OrderResponse>>(`/v1/payments/webhook`, { transactionRef, status }),
};
