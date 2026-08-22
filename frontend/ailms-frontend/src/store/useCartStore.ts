import { create } from "zustand";
import { studentApi, type StudentCartItem } from "@/api/student/studentApi";
import type { CouponResponse, OneOnOneNeedsPayload } from "@/api/orders/orderApi";

interface CartState {
  items: StudentCartItem[];
  appliedCoupon: CouponResponse | null;
  discountAmount: number;
  isCartOpen: boolean;
  loading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  fetchCart: () => Promise<void>;
  addToCart: (coursePackageId: string, needs?: OneOnOneNeedsPayload) => Promise<StudentCartItem>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
  setAppliedCoupon: (coupon: CouponResponse | null, discount?: number) => void;
  removeCoupon: () => void;
  getTotalAmount: () => number;
  getFinalAmount: () => number;
}

/** Giữ giỏ backend làm nguồn dữ liệu duy nhất cho header và các luồng mua hàng. */
export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  appliedCoupon: null,
  discountAmount: 0,
  isCartOpen: false,
  loading: false,
  error: null,

  /** Mở drawer giỏ hàng khi khu vực sử dụng drawer yêu cầu. */
  openCart: () => set({ isCartOpen: true }),

  /** Đóng drawer giỏ hàng. */
  closeCart: () => set({ isCartOpen: false }),

  /** Đổi trạng thái hiển thị drawer giỏ hàng. */
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  /** Đồng bộ toàn bộ giỏ từ API học viên hiện tại. */
  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      set({ items: await studentApi.getCart() });
    } catch {
      set({ items: [], error: "Không thể tải giỏ hàng." });
    } finally {
      set({ loading: false });
    }
  },

  /** Thêm package qua backend rồi cập nhật badge ngay mà không điều hướng. */
  addToCart: async (coursePackageId, needs) => {
    const item = await studentApi.addToCart(coursePackageId, needs);
    set((state) => ({
      items: state.items.some((current) => current.id === item.id)
        ? state.items
        : [...state.items, item],
      error: null,
    }));
    return item;
  },

  /** Xóa cart item trên backend trước khi cập nhật giao diện. */
  removeFromCart: async (id) => {
    await studentApi.removeFromCart(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  /** Xóa tuần tự các dòng hiện có bằng API sở hữu giỏ hàng. */
  clearCart: async () => {
    const ids = get().items.map((item) => item.id);
    await Promise.all(ids.map((id) => studentApi.removeFromCart(id)));
    set({ items: [], appliedCoupon: null, discountAmount: 0 });
  },

  /** Xóa dữ liệu giỏ khỏi bộ nhớ khi đăng xuất hoặc đổi tài khoản. */
  resetCart: () => set({ items: [], appliedCoupon: null, discountAmount: 0, error: null }),

  /** Lưu voucher đang áp dụng cho drawer hiện tại. */
  setAppliedCoupon: (coupon, discount = 0) => set({ appliedCoupon: coupon, discountAmount: discount }),

  /** Bỏ voucher khỏi trạng thái giỏ cục bộ. */
  removeCoupon: () => set({ appliedCoupon: null, discountAmount: 0 }),

  /** Tính tạm tính từ các package thật backend trả về. */
  getTotalAmount: () => get().items.reduce((sum, item) => sum + item.price, 0),

  /** Tính số tiền sau voucher đang áp dụng. */
  getFinalAmount: () => Math.max(0, get().getTotalAmount() - get().discountAmount),
}));
