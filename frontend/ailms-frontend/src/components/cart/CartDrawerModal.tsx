import React, { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { orderApi } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  X,
  Trash2,
  Tag,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface CartDrawerModalProps {
  onProceedToCheckout: () => void;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({
  onProceedToCheckout,
}) => {
  const {
    items,
    isCartOpen,
    closeCart,
    removeFromCart,
    clearCart,
    appliedCoupon,
    discountAmount,
    setAppliedCoupon,
    removeCoupon,
    getTotalAmount,
    getFinalAmount,
  } = useCartStore();

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  if (!isCartOpen) return null;

  const totalAmount = getTotalAmount();
  const finalAmount = getFinalAmount();

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    try {
      setValidatingCoupon(true);
      setCouponError(null);
      setCouponSuccess(null);

      // Try Backend validation API
      try {
        const res = await orderApi.validateCoupon({
          code,
          totalAmount,
        });
        if (res.data.success && res.data.data) {
          const { coupon, discountAmount: disc } = res.data.data;
          setAppliedCoupon(coupon, disc);
          setCouponSuccess(`Đã áp dụng mã ${code}: Giảm ${disc.toLocaleString()} đ`);
          setCouponCode("");
          return;
        }
      } catch {
        setCouponError("Mã giảm giá không hợp lệ hoặc đã hết hạn sử dụng.");
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-lg h-full border-l border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">Giỏ hàng của bạn</h2>
              <p className="text-xs text-muted-foreground">
                {items.length} khóa học / gói học tập đã chọn
              </p>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body - Items List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 divide-y divide-border/60">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start group">
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border bg-primary/10">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[9px] font-extrabold uppercase text-primary tracking-wider block">
                    Gói học AILMS
                  </span>
                  <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-2">
                    {item.courseTitle}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {item.packageName}
                  </p>
                  <span className="font-extrabold text-primary text-xs block pt-0.5">
                    {item.price.toLocaleString()} đ
                  </span>
                </div>
                <button
                  onClick={() => void removeFromCart(item.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Xóa khỏi giỏ hàng"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-3">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <h3 className="font-bold text-foreground text-sm">Giỏ hàng đang trống</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Khám phá ngay các khóa học chất lượng cao để thêm vào giỏ hàng của bạn.
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer - Coupon & Totals */}
        {items.length > 0 && (
          <div className="p-5 border-t border-border bg-card space-y-4">
            {/* Coupon Code Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Mã giảm giá (Coupon):</span>
              </div>

              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Mã {appliedCoupon.code} (-{discountAmount.toLocaleString()} đ)</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-[10px] font-extrabold text-muted-foreground hover:text-destructive uppercase underline"
                  >
                    Bỏ mã
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nhập mã (ví dụ: AILMS20, STUDENT500K)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="rounded-xl text-xs uppercase"
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="rounded-xl text-xs font-bold px-4 shrink-0"
                  >
                    {validatingCoupon ? "Kiểm tra..." : "Áp dụng"}
                  </Button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] font-bold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {couponSuccess}
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính ({items.length} món):</span>
                <span className="font-bold text-foreground">{totalAmount.toLocaleString()} đ</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Giảm giá Coupon:</span>
                  <span>-{discountAmount.toLocaleString()} đ</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-foreground pt-1 border-t border-border/80">
                <span>Tổng thanh toán:</span>
                <span className="text-primary">{finalAmount.toLocaleString()} đ</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={() => {
                  closeCart();
                  onProceedToCheckout();
                }}
                className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground text-sm shadow-lg shadow-primary/20 gap-2"
              >
                <span>Tiến hành Thanh toán</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => void clearCart()}
                className="w-full text-center text-[11px] font-bold text-muted-foreground hover:text-destructive transition-colors py-1"
              >
                Xóa tất cả sản phẩm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
