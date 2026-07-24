import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/store/useCartStore";
import type { PaymentMethod, OrderResponse } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Lock,
  Zap,
  Copy,
  Clock,
  RefreshCw,
  Check,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  directCourseItem?: any | null; // Support direct "Đăng ký học ngay"
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  directCourseItem,
}) => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const {
    items: cartItems,
    appliedCoupon,
    discountAmount,
    getTotalAmount,
    getFinalAmount,
    clearCart,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VNPAY");
  const [step, setStep] = useState<"SELECT_METHOD" | "SCAN_QR" | "SUCCESS">("SELECT_METHOD");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes countdown

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("SELECT_METHOD");
      setCompletedOrder(null);
      setTimeLeft(900);
    }
  }, [isOpen]);

  // Countdown timer for QR code payment
  useEffect(() => {
    if (step !== "SCAN_QR") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  if (!isOpen) return null;

  // Items to checkout
  const checkoutItems = directCourseItem
    ? [
        {
          id: directCourseItem.id || "direct-1",
          coursePackageId: directCourseItem.packageId || `pkg-${directCourseItem.id}`,
          courseId: directCourseItem.id,
          courseName: directCourseItem.name,
          categoryName: directCourseItem.categoryName || "Khóa học AILMS",
          image: directCourseItem.image,
          packageName: directCourseItem.packageName || "Gói Tự Học Standard (Lifetime)",
          deliveryMode: "SELF_STUDY",
          price: directCourseItem.suggestedPrice || 3200000,
        },
      ]
    : cartItems;

  const totalAmount = directCourseItem
    ? directCourseItem.suggestedPrice || 3200000
    : getTotalAmount();

  const finalAmount = directCourseItem
    ? Math.max(0, totalAmount - discountAmount)
    : getFinalAmount();

  const generatedOrderId = completedOrder?.id || `ORD-${Date.now().toString().slice(-6)}`;
  const transferMemo = `AILMS ${generatedOrderId}`;

  // Step 1: Proceed to QR Scan Screen
  const handleProceedToQR = () => {
    if (!auth.accessToken) {
      alert("Vui lòng đăng nhập để hoàn tất đơn hàng.");
      return;
    }
    setStep("SCAN_QR");
  };

  // Step 2: Confirm & Verify Payment Webhook simulation
  const handleConfirmTransfer = async () => {
    try {
      setVerifyingPayment(true);

      // Simulate payment gateway verification / webhook callback delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const orderResult: OrderResponse = {
        id: generatedOrderId,
        userId: auth.user?.id || "usr-1",
        userName: auth.user?.fullName || auth.user?.username || "Học viên AILMS",
        userEmail: auth.user?.email || "hocvien@ailms.edu.vn",
        status: "PAID",
        totalAmount,
        discountAmount,
        finalAmount,
        couponCode: appliedCoupon?.code,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: checkoutItems.map((item, idx) => ({
          id: `item-${idx + 1}`,
          orderId: generatedOrderId,
          coursePackageId: String(item.coursePackageId),
          courseName: item.courseName,
          packageName: item.packageName,
          priceSnapshot: item.price,
          discountSnapshot: discountAmount,
          finalPrice: item.price - discountAmount,
          itemType: "NEW_PURCHASE",
        })),
      };

      // 3. Save Enrolled Courses to localStorage for instant Student Dashboard sync
      const userId = auth.user?.id || "guest";
      const storageKey = `my_enrolled_courses_${userId}`;
      const existingEnrolled = JSON.parse(localStorage.getItem(storageKey) || "[]");

      const newEnrolled = checkoutItems.map((item) => ({
        id: item.courseId,
        name: item.courseName,
        categoryName: item.categoryName,
        image: item.image,
        packageName: item.packageName,
        enrolledAt: new Date().toISOString(),
        progressPercent: 0,
        lastLessonTitle: "Bài 1: Giới thiệu khóa học",
      }));

      const mergedEnrolled = [...existingEnrolled];
      newEnrolled.forEach((ne) => {
        if (!mergedEnrolled.some((e: any) => String(e.id) === String(ne.id))) {
          mergedEnrolled.push(ne);
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(mergedEnrolled));

      // Clear Cart if checking out from Cart
      if (!directCourseItem) {
        clearCart();
      }

      setCompletedOrder(orderResult);
      setStep("SUCCESS");
    } catch (err) {
      console.error("Error verifying payment:", err);
      alert("Chưa ghi nhận được giao dịch. Vui lòng kiểm tra lại chuyển khoản hoặc thử lại.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const copyMemo = () => {
    navigator.clipboard.writeText(transferMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const PAYMENT_METHODS: {
    id: PaymentMethod;
    name: string;
    description: string;
    icon: any;
    badge?: string;
  }[] = [
    {
      id: "VNPAY",
      name: "Cổng VNPAY (Mã QR / Thẻ ATM)",
      description: "Thanh toán quét mã VNPAY-QR qua hơn 30 ứng dụng Ngân hàng & Ví điện tử",
      icon: QrCode,
      badge: "Khuyên dùng",
    },
    {
      id: "BANK_TRANSFER",
      name: "Chuyển khoản Ngân hàng (VietQR)",
      description: "Quét mã VietQR chuyển khoản trực tiếp, tự động duyệt 24/7 trong 30 giây",
      icon: CreditCard,
      badge: "Duyệt nhanh",
    },
    {
      id: "MOMO",
      name: "Ví MoMo QR",
      description: "Quét mã thanh toán trực tiếp qua ứng dụng Ví điện tử MoMo",
      icon: Zap,
    },
    {
      id: "MOCK",
      name: "Thanh toán Thử nghiệm Fast-Pay",
      description: "Xác nhận tức thì không qua cổng thực tế (Dành cho môi trường Demo)",
      icon: Sparkles,
      badge: "Demo",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 via-indigo-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">
                {step === "SUCCESS"
                  ? "Xác nhận thanh toán thành công"
                  : step === "SCAN_QR"
                  ? "Quét mã QR để hoàn tất thanh toán"
                  : "Thanh toán khóa học AILMS"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === "SUCCESS"
                  ? "Hóa đơn điện tử & Kích hoạt học ngay"
                  : "Bảo mật mã hóa SSL 256-bit tiêu chuẩn quốc tế"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 3: SUCCESS CONFIRMATION SCREEN */}
          {step === "SUCCESS" && completedOrder ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-extrabold uppercase tracking-wider">
                  Thanh toán thành công 100%
                </span>
                <h3 className="text-2xl font-extrabold text-foreground">
                  Chúc mừng bạn đã sở hữu khóa học!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Mã đơn hàng: <strong className="text-foreground">{completedOrder.id}</strong>. Hóa đơn điện tử xác nhận đã được gửi tự động tới email <span className="text-primary font-bold">{completedOrder.userEmail}</span>.
                </p>
              </div>

              {/* Order Items Summary */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-left space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Khóa học đã kích hoạt vào tài khoản:
                </h4>
                {completedOrder.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-xs font-bold p-2 bg-card rounded-xl border border-border/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-foreground line-clamp-1">{it.courseName}</span>
                    </div>
                    <span className="text-primary font-extrabold shrink-0">{it.finalPrice.toLocaleString()} đ</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-extrabold text-foreground">
                  <span>Tổng số tiền đã quyết toán:</span>
                  <span className="text-emerald-600 text-base">{completedOrder.finalAmount.toLocaleString()} đ</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    onClose();
                    navigate(`/courses/${checkoutItems[0]?.courseId || "355582871404154883"}`);
                  }}
                  className="w-full sm:w-auto h-11 rounded-xl font-bold bg-primary text-primary-foreground px-8 gap-2 shadow-lg shadow-primary/20"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Vào học bài giảng ngay</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    navigate("/dashboard");
                  }}
                  className="w-full sm:w-auto h-11 rounded-xl font-bold px-6"
                >
                  Về Dashboard Học Viên
                </Button>
              </div>
            </div>
          ) : step === "SCAN_QR" ? (
            /* STEP 2: INTERACTIVE QR CODE SCANNER VIEW */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Timer Bar */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Thời gian hoàn tất thanh toán còn:</span>
                </div>
                <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {formatTimer(timeLeft)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left QR Code Display */}
                <div className="md:col-span-6 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-md text-center space-y-3">
                  <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    {paymentMethod === "VNPAY"
                      ? "Cổng VNPAY-QR"
                      : paymentMethod === "MOMO"
                      ? "Ví Điện Tử MoMo"
                      : "Mã VietQR Ngân Hàng"}
                  </div>

                  {/* Generated QR Image Display */}
                  <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=20022302-AILMS-${generatedOrderId}-${finalAmount}`}
                      alt="VietQR Payment Code"
                      className="w-48 h-48 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-xs p-1.5 rounded-lg border border-slate-300 shadow">
                        <span className="text-[10px] font-black text-blue-700">AILMS</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium">
                    Mở app ngân hàng / Ví điện tử và chọn <strong className="text-slate-900">Quét mã QR</strong>
                  </p>
                </div>

                {/* Right Bank Details */}
                <div className="md:col-span-6 space-y-3 text-xs">
                  <h4 className="font-extrabold uppercase text-muted-foreground text-[10px] tracking-wider">
                    Thông tin chuyển khoản thủ công:
                  </h4>

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <span className="font-extrabold text-foreground">MBBank (Ngân hàng Quân Đội)</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Số tài khoản:</span>
                      <span className="font-mono font-extrabold text-primary text-sm">09123456789</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Chủ tài khoản:</span>
                      <span className="font-bold text-foreground">CTCP AILMS EDTECH</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/60">
                      <span className="text-muted-foreground">Số tiền:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{finalAmount.toLocaleString()} VNĐ</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-primary/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold">Nội dung chuyển khoản:</span>
                        <span className="font-mono font-extrabold text-primary text-xs">{transferMemo}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={copyMemo}
                        className="h-8 px-2.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 gap-1"
                      >
                        {copiedMemo ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedMemo ? "Đã chép" : "Sao chép"}</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic">
                    * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động duyệt trong 30s.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 1: CHECKOUT METHOD FORM */
            <div className="space-y-6">
              {/* Order Summary list */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Tóm tắt đơn hàng ({checkoutItems.length} khóa học):
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground line-clamp-1 flex-1 pr-2">
                        {item.courseName} ({item.packageName})
                      </span>
                      <span className="text-foreground shrink-0">{item.price.toLocaleString()} đ</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/60 space-y-1 text-xs">
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Mã giảm giá ({appliedCoupon?.code}):</span>
                      <span>-{discountAmount.toLocaleString()} đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-foreground pt-1">
                    <span>Tổng cần thanh toán:</span>
                    <span className="text-primary text-base">{finalAmount.toLocaleString()} đ</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground block">
                  Chọn phương thức thanh toán:
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border/70 bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-foreground">{pm.name}</h4>
                              {pm.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold uppercase">
                                  {pm.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {pm.description}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step === "SELECT_METHOD" && (
          <div className="p-5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Giao dịch an toàn & Hoàn tiền trong 7 ngày</span>
            </div>
            <Button
              onClick={handleProceedToQR}
              className="w-full sm:w-auto h-11 rounded-xl font-extrabold px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
            >
              <span>Tiếp tục tạo mã QR ({finalAmount.toLocaleString()} đ)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "SCAN_QR" && (
          <div className="p-5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setStep("SELECT_METHOD")}
              className="w-full sm:w-auto rounded-xl text-xs font-bold"
            >
              Quay lại chọn phương thức
            </Button>

            <Button
              onClick={handleConfirmTransfer}
              disabled={verifyingPayment}
              className="w-full sm:w-auto h-11 rounded-xl font-extrabold px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
            >
              {verifyingPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Đang đối soát giao dịch ngân hàng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Tôi đã quét mã & Chuyển khoản thành công</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
