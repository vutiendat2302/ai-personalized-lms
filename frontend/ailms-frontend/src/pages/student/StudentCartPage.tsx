import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { studentApi, type StudentCartItem, type StudentVoucher } from "@/api/student/studentApi";
import { orderApi } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { ShoppingCart, ArrowRight, BookOpen, Loader2, Package, UserRound, Users } from "lucide-react";
import { Trash2 } from "lucide-react";
import axios from "axios";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";



import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/store/useCartStore";

export const StudentCartPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const fetchHeaderCart = useCartStore((state) => state.fetchCart);

  const [cartItems, setCartItems] = useState<Array<StudentCartItem & { isSelected: boolean }>>([]);
  const [couponCode, setCouponCode] = useState(() => {
    const state = location.state as { couponCode?: string } | null;
    return state?.couponCode || "";
  });
  const [vouchers, setVouchers] = useState<StudentVoucher[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [scheduleConflict, setScheduleConflict] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    Promise.all([studentApi.getCart(), studentApi.getVouchers()])
      .then(([cartData, voucherData]) => {
        setCartItems(cartData.map((item) => ({ ...item, isSelected: true })));
        setVouchers(voucherData);
        void fetchHeaderCart();
      })
      .catch(() => setLoadError("Không thể tải giỏ hàng của bạn."))
      .finally(() => setLoading(false));
  }, [fetchHeaderCart]);

  /** Định dạng giá VNĐ lấy từ backend. */
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  /** Chọn hoặc bỏ chọn một gói học trong giỏ hàng. */
  const toggleSelect = (id: string) => {
    setCartItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, isSelected: !item.isSelected } : item)),
    );
    setCouponApplied(false);
    setDiscountAmount(0);
  };

  /** Kiểm tra voucher được chọn trên toàn bộ giỏ hiện tại. */
  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!couponCode.trim() || selectedItems.length === 0) {
      setCouponError("Vui lòng chọn gói học và nhập mã voucher trước khi áp dụng.");
      return;
    }
    try {
      setCouponLoading(true);
      const res = await studentApi.validateCoupon(couponCode.trim(), selectedItems.map((item) => item.coursePackageId));
      setDiscountAmount(res.discountAmount);
      setCouponApplied(res.valid);
      if (res.valid) success(res.message);
      else setCouponError(res.message);
    } catch (couponValidationError) {
      const message = axios.isAxiosError(couponValidationError)
        ? String(couponValidationError.response?.data?.message || "Voucher không thể áp dụng.")
        : "Voucher không thể áp dụng.";
      setDiscountAmount(0);
      setCouponApplied(false);
      setCouponError(message);
    } finally {
      setCouponLoading(false);
    }
  };

  /** Xóa một dòng giỏ hàng qua API của chủ giỏ. */
  const handleRemove = async (id: string) => {
    try {
      setRemovingId(id);
      await studentApi.removeFromCart(id);
      setCartItems((previous) => previous.filter((item) => item.id !== id));
      void fetchHeaderCart();
      setCouponApplied(false);
      setDiscountAmount(0);
      success("Đã xóa gói học khỏi giỏ hàng.");
    } catch {
      error("Không thể xóa gói học khỏi giỏ hàng.");
    } finally {
      setRemovingId("");
    }
  };

  const selectedItems = cartItems.filter((i) => i.isSelected);
  const totalAmount = selectedItems.reduce((acc, i) => acc + i.price, 0);
  const finalAmount = Math.max(0, totalAmount - discountAmount);

  /** Trả icon và nhãn hình thức học cho card giỏ hàng. */
  const deliveryMeta = (mode: StudentCartItem["deliveryMode"]) => {
    if (mode === "GROUP_CLASS") return { label: "Lớp học nhóm", icon: Users };
    if (mode === "ONE_ON_ONE") return { label: "Kèm riêng 1-1", icon: UserRound };
    return { label: "Tự học", icon: BookOpen };
  };

  /** Tạo PayPal checkout hoặc hoàn tất đơn hàng miễn phí. */
  const handleCheckout = async (acceptScheduleConflict = false) => {
    if (selectedItems.length === 0) {
      error("Vui lòng chọn ít nhất 1 sản phẩm trong giỏ hàng để thanh toán!");
      return;
    }
    const missingNeedsItem = selectedItems.find((item) => item.requiresTutorNeeds && !item.oneOnOneNeeds);
    if (missingNeedsItem) {
      error(`Gói ${missingNeedsItem.packageName} cần bổ sung nhu cầu học tập trước khi thanh toán.`);
      navigate(`/courses/${missingNeedsItem.courseId}`);
      return;
    }
    setCheckoutLoading(true);
    try {
      const payment = await orderApi.checkoutCart(
        selectedItems.map((item) => ({
          coursePackageId: item.coursePackageId,
          oneOnOneNeeds: item.oneOnOneNeeds || undefined,
        })),
        couponApplied ? couponCode.trim() : undefined,
        acceptScheduleConflict,
      );
      sessionStorage.setItem("ailms_pending_order_id", payment.orderId);
      window.location.assign(payment.payUrl);
    } catch (checkoutError) {
      const message = axios.isAxiosError(checkoutError)
        ? String(checkoutError.response?.data?.message || "Không thể tạo thanh toán PayPal.")
        : "Không thể tạo thanh toán PayPal.";
      if (message.includes("acceptScheduleConflict=true")) setScheduleConflict(message);
      else error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Đang tải giỏ hàng">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 md:grid-cols-12">
          <div className="space-y-4 md:col-span-8"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
          <Skeleton className="h-72 md:col-span-4" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return <Card className="p-10 text-center text-sm text-destructive">{loadError}</Card>;
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
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-xs">
              <span className="font-semibold text-muted-foreground">Đã chọn {selectedItems.length}/{cartItems.length} gói học</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                const selectAll = selectedItems.length !== cartItems.length;
                setCartItems((items) => items.map((item) => ({ ...item, isSelected: selectAll })));
                setCouponApplied(false);
                setDiscountAmount(0);
              }}>{selectedItems.length === cartItems.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {cartItems.map((item) => {
                const meta = deliveryMeta(item.deliveryMode);
                const ModeIcon = meta.icon;
                return (
                  <Card key={item.id} className={`relative overflow-hidden p-0 transition ${item.isSelected ? "border-primary ring-2 ring-primary/15" : "border-border/60 hover:border-primary/35"}`}>
                    <div className="flex h-full">
                      <div className="flex w-20 shrink-0 items-center justify-center bg-primary/10 text-primary">
                        <ModeIcon className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-4 p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={item.isSelected} onCheckedChange={() => toggleSelect(item.id)} aria-label={`Chọn ${item.packageName}`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">{meta.label}</span>
                            <h3 className="mt-1 line-clamp-2 font-bold text-foreground">{item.courseTitle}</h3>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.packageName}</p>
                            {item.requiresTutorNeeds && !item.oneOnOneNeeds && (
                              <Button
                                type="button"
                                variant="link"
                                className="mt-1 h-auto p-0 text-xs text-destructive"
                                onClick={() => navigate(`/courses/${item.courseId}`)}
                              >
                                Bổ sung nhu cầu học tập để thanh toán
                              </Button>
                            )}
                          </div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => void handleRemove(item.id)}
                            disabled={Boolean(removingId)} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Xóa khỏi giỏ hàng">
                            {removingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between border-t pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> Một gói học</div>
                          <strong className="text-base text-primary">{formatVND(item.price)}</strong>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Checkout & Coupon Summary */}
          <div className="md:col-span-4 space-y-4">
            <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground border-b border-border/40 pb-2 flex items-center justify-between">
                <span>Mã giảm giá Coupon</span>
                {couponApplied && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Đã áp dụng
                  </span>
                )}
              </h3>
              <div className="space-y-3 text-xs">
                {/* Input nhập mã trực tiếp */}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nhập mã voucher..."
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponApplied(false);
                      setDiscountAmount(0);
                      setCouponError("");
                    }}
                    className="h-9 text-xs uppercase font-mono tracking-wider rounded-lg"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleApplyCoupon()}
                    disabled={couponLoading || !couponCode.trim() || selectedItems.length === 0}
                    size="sm"
                    className="bg-primary text-primary-foreground text-xs font-bold h-9 px-4 shrink-0 cursor-pointer shadow-xs"
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp dụng"}
                  </Button>
                </div>

                {/* Danh sách voucher khả dụng trong ví học viên để chọn nhanh */}
                {vouchers.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Voucher trong ví của bạn:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {vouchers.map((voucher) => (
                        <button
                          key={voucher.id}
                          type="button"
                          disabled={!voucher.usable}
                          onClick={() => {
                            setCouponCode(voucher.code);
                            setCouponApplied(false);
                            setDiscountAmount(0);
                            setCouponError("");
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer text-left ${
                            couponCode === voucher.code
                              ? "bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary/30"
                              : voucher.usable
                              ? "bg-muted/40 hover:bg-muted border-border/70 text-foreground"
                              : "bg-muted/20 border-border/30 text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                          title={voucher.unavailableReason || (voucher.discountType === "PERCENT" ? `Giảm ${voucher.discountValue}%` : `Giảm ${formatVND(voucher.discountValue)}`)}
                        >
                          <span className="font-bold">{voucher.code}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (-{voucher.discountType === "PERCENT" ? `${voucher.discountValue}%` : formatVND(voucher.discountValue)})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {couponError && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{couponError}</p>}
                {couponApplied && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Áp dụng mã {couponCode} thành công! {finalAmount === 0 ? "🎉 Đơn hàng được miễn phí 100%." : ""}
                  </p>
                )}
              </div>

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
                onClick={() => void handleCheckout(false)}
                disabled={checkoutLoading || selectedItems.length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl h-10 gap-2 cursor-pointer shadow-md"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo thanh toán...
                  </>
                ) : finalAmount === 0 && selectedItems.length > 0 ? (
                  <>
                    Đăng ký khóa học ngay (Miễn phí)
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Tiến hành Thanh Toán
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      )}
      <ConfirmDialog open={Boolean(scheduleConflict)} onOpenChange={(open) => !open && setScheduleConflict("")}
        title="Lịch học bị trùng" description={scheduleConflict} confirmText="Vẫn tiếp tục thanh toán"
        cancelText="Xem lại giỏ hàng" variant="warning" loading={checkoutLoading}
        onConfirm={() => handleCheckout(true)} />
      {checkoutLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"><div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 text-sm font-semibold shadow-xl"><Loader2 className="h-5 w-5 animate-spin text-primary" />Đang tạo và xác nhận phiên thanh toán PayPal...</div></div>}
    </div>
  );
};
