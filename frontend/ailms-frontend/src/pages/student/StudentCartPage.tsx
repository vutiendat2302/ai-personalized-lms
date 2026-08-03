import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi, type StudentCartItem } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { ShoppingCart, Check, Tag, ArrowRight } from "lucide-react";

export const StudentCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [cartItems, setCartItems] = useState<StudentCartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getCart().then((res) => {
      setCartItems(res);
      setLoading(false);
    });
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const toggleSelect = (id: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    if (!couponCode.trim()) return;

    const res = await studentApi.validateCoupon(couponCode);
    if (res.isValid) {
      setDiscountAmount(res.discountAmount);
      setCouponApplied(true);
      success(res.message);
    } else {
      setDiscountAmount(0);
      setCouponApplied(false);
      setCouponError(res.message);
    }
  };

  const selectedItems = cartItems.filter((i) => i.isSelected);
  const totalAmount = selectedItems.reduce((acc, i) => acc + i.price, 0);
  const finalAmount = Math.max(0, totalAmount - discountAmount);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      error("Vui lòng chọn ít nhất 1 sản phẩm trong giỏ hàng để thanh toán!");
      return;
    }
    success("Đang chuyển hướng tới Cổng thanh toán VNPAY / MOMO...");
    setTimeout(() => {
      navigate("/student/orders");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải giỏ hàng của bạn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Giỏ hàng của tôi
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Kiểm tra các gói học đã chọn, áp dụng mã giảm giá Coupon và tiến hành thanh toán.
        </p>
      </div>

      {cartItems.length === 0 ? (
        <Card className="bg-card border-border/40 p-12 text-center text-muted-foreground space-y-3 shadow-xs">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">Giỏ hàng của bạn đang trống.</p>
          <Button onClick={() => navigate("/student/catalog")} className="bg-primary text-primary-foreground text-xs font-bold rounded-lg">
            Khám phá Khóa học ngay
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Cart Items List */}
          <div className="md:col-span-8 space-y-3">
            {cartItems.map((item) => (
              <Card key={item.id} className="bg-card border-border/40 p-4 flex items-start gap-3 shadow-xs">
                <input
                  type="checkbox"
                  checked={item.isSelected}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
                <div className="flex-1 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-primary uppercase">{item.deliveryMode}</span>
                  <h3 className="font-bold text-foreground">{item.courseTitle}</h3>
                  <p className="text-muted-foreground">{item.packageName}</p>
                </div>
                <span className="text-sm font-black text-primary">{formatVND(item.price)}</span>
              </Card>
            ))}
          </div>

          {/* Checkout & Coupon Summary */}
          <div className="md:col-span-4 space-y-4">
            <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">Mã giảm giá Coupon</h3>
              <form onSubmit={handleApplyCoupon} className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="VD: SUMMER2026"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-xl px-3 h-9 text-xs text-foreground uppercase"
                  />
                  <Button type="submit" size="sm" className="bg-primary text-primary-foreground text-xs font-bold h-9 px-3 cursor-pointer">
                    Áp dụng
                  </Button>
                </div>

                {couponError && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{couponError}</p>}
                {couponApplied && <p className="text-[11px] text-emerald-600 font-bold">Mã coupon hợp lệ!</p>}
              </form>

              <div className="pt-3 border-t border-border/40 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
                  <span className="font-semibold text-foreground">{formatVND(totalAmount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                    <span>Chiết khấu Coupon:</span>
                    <span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/40">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base font-black text-primary">{formatVND(finalAmount)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl h-10 gap-2 cursor-pointer shadow-md"
              >
                Tiến hành Thanh Toán
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
