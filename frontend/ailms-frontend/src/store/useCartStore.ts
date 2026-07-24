import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CouponResponse } from "@/api/orders/orderApi";

interface CartState {
  items: CartItem[];
  appliedCoupon: CouponResponse | null;
  discountAmount: number;
  isCartOpen: boolean;
  
  // Actions
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string | number) => void;
  clearCart: () => void;
  setAppliedCoupon: (coupon: CouponResponse | null, discount?: number) => void;
  removeCoupon: () => void;
  getTotalAmount: () => number;
  getFinalAmount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: "cart-mock-1",
          coursePackageId: "pkg-1",
          courseId: "355582871404154883",
          courseName: "Toàn tập Marketing số cho người mới bắt đầu #1994",
          categoryName: "Marketing số",
          image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60",
          packageName: "Gói Tự Học Standard (Lifetime)",
          deliveryMode: "SELF_STUDY",
          price: 4100000,
        },
      ],
      appliedCoupon: null,
      discountAmount: 0,
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      addToCart: (item) => {
        const existing = get().items.find(
          (i) => i.coursePackageId === item.coursePackageId
        );
        if (existing) {
          set({ isCartOpen: true });
          return;
        }
        const newItem: CartItem = {
          ...item,
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        };
        set((state) => ({
          items: [...state.items, newItem],
          isCartOpen: true,
        }));
      },

      removeFromCart: (id) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== id);
          return { items: newItems };
        });
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null, discountAmount: 0 });
      },

      setAppliedCoupon: (coupon, discount = 0) => {
        set({ appliedCoupon: coupon, discountAmount: discount });
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, discountAmount: 0 });
      },

      getTotalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0);
      },

      getFinalAmount: () => {
        const total = get().getTotalAmount();
        const discount = get().discountAmount;
        return Math.max(0, total - discount);
      },
    }),
    {
      name: "ailms_cart_storage",
    }
  )
);
