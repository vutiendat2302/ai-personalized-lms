import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi, type StudentOrderItem } from "@/api/student/studentApi";
import type { OrderResponse } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Receipt, Download, ArrowUpRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { Textarea } from "@/components/ui/textarea";

export const StudentOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [orders, setOrders] = useState<StudentOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<StudentOrderItem | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    studentApi.getOrders().then(setOrders)
      .catch(() => setLoadError("Không thể tải lịch sử đơn hàng."))
      .finally(() => setLoading(false));
  }, []);

  /** Định dạng snapshot giá trong đơn hàng thành VNĐ. */
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  /** Gửi refund và tải lại trạng thái đơn hàng sau khi PayPal hoàn tất. */
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !refundReason.trim()) return;
    try {
      setRefundLoading(true);
      await studentApi.requestRefund(selectedOrder.id, refundReason);
      success("Đã gửi yêu cầu hoàn tiền. HR/Admin sẽ phê duyệt trước khi PayPal hoàn tiền.");
      setOrders(await studentApi.getOrders());
      setShowRefundModal(false);
      setRefundReason("");
    } catch {
      error("Không thể hoàn tiền đơn hàng.");
    } finally {
      setRefundLoading(false);
    }
  };

  /** Lấy chi tiết đơn hàng có kiểm tra ownership ở backend. */
  const handleViewDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      setOrderDetail(await studentApi.getOrderDetail(orderId));
    } catch {
      error("Không thể tải chi tiết hóa đơn.");
    } finally {
      setDetailLoading(false);
    }
  };

  /** Tải blob PDF hóa đơn từ endpoint học viên. */
  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const blob = await studentApi.downloadInvoice(orderId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `AILMS-invoice-${orderId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      error("Không thể tải hóa đơn PDF. Hóa đơn chỉ có sau khi thanh toán.");
    }
  };


  if (loading) {
    return <StudentPageSkeleton cards={3} columns={1} />;
  }

  if (loadError) return <Card className="p-10 text-center text-sm text-destructive">{loadError}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Đơn hàng của tôi (Order History)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi lịch sử mua gói học, xem chi tiết, tải hóa đơn PDF và yêu cầu hoàn tiền.
        </p>
      </div>

      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-sm font-bold text-foreground">Lịch sử đơn hàng</h2>
        <span className="text-xs text-muted-foreground">{orders.length} đơn hàng</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {orders.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground xl:col-span-2">Bạn chưa có đơn hàng nào.</Card>
          ) : orders.map((ord) => (
            <Card key={ord.id} className="overflow-hidden border-border/60 p-0 shadow-xs transition hover:border-primary/35 hover:shadow-lg">
              <div className={`h-1.5 ${ord.status === "PAID" ? "bg-emerald-500" : ord.status === "PENDING" ? "bg-amber-500" : ord.status === "REFUNDED" ? "bg-blue-500" : ord.status === "EXPIRED" ? "bg-rose-400" : ord.status === "CANCELLED" ? "bg-muted-foreground/50" : "bg-muted-foreground/40"}`} />
              <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-mono">{ord.id}</span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                        ord.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : ord.status === "PENDING"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : ord.status === "EXPIRED"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          : ord.status === "CANCELLED"
                          ? "bg-muted text-muted-foreground border border-border"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ngày mua: {new Date(ord.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <span className="text-base font-black text-primary font-mono">{formatVND(ord.finalAmount)}</span>
              </div>

              <div className="max-h-36 space-y-2 overflow-y-auto text-xs text-foreground">
                {ord.items.map((it, idx) => (
                  <div key={`${it.courseName}-${it.packageName}-${idx}`} className="flex justify-between gap-3 rounded-xl bg-muted/35 p-3">
                    <div className="min-w-0"><p className="line-clamp-1 font-semibold">{it.courseName}</p><p className="line-clamp-1 text-muted-foreground">{it.packageName}</p></div>
                    <span className="shrink-0 font-mono text-muted-foreground">{formatVND(it.price)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDownloadInvoice(ord.id)}
                  disabled={ord.status !== "PAID" && ord.status !== "REFUNDED"}
                  className="text-xs border-border text-foreground hover:bg-muted cursor-pointer gap-1.5 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải hóa đơn PDF
                </Button>

                <Button size="sm" variant="outline" onClick={() => void handleViewDetail(ord.id)}
                  disabled={detailLoading} className="text-xs h-8">
                  Xem chi tiết
                </Button>

                <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 pt-1">
                  {ord.status === "PAID" && ord.refundRequestStatus === "PENDING" && (
                    <span className="inline-flex h-8 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      Đang chờ HR duyệt hoàn tiền
                    </span>
                  )}
                  {ord.status === "PAID" && ord.eligibleForRefund && !ord.refundRequestStatus && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setShowRefundModal(true);
                      }}
                      className="text-xs border-rose-300 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer h-8"
                    >
                      Yêu cầu hoàn tiền
                    </Button>
                  )}

                  {ord.status === "PAID" && (
                    <Button
                      size="sm"
                      onClick={() => navigate("/student/catalog")}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg gap-1.5 cursor-pointer h-8"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Nâng cấp / Mua thêm gói
                    </Button>
                  )}

                </div>
              </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Refund Request Modal */}
      <Dialog open={showRefundModal && Boolean(selectedOrder)} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-md rounded-2xl">
          {selectedOrder && <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Yêu cầu hoàn tiền đơn {selectedOrder.id}</h3>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Vui lòng nhập lý do muốn hoàn tiền. Yêu cầu sẽ được HR/Admin xem xét trước khi hoàn tiền.
              </p>

              <Textarea
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-foreground"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  disabled={refundLoading}
                  className="text-xs border-border text-foreground cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={refundLoading || !refundReason.trim()} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer">
                  {refundLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang gửi...</> : "Gửi yêu cầu hoàn tiền"}
                </Button>
              </div>
            </form>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(orderDetail)} onOpenChange={(open) => !open && setOrderDetail(null)}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết hóa đơn INV-{orderDetail?.id}</DialogTitle>
            <DialogDescription>Dữ liệu giá được chụp tại thời điểm tạo đơn hàng.</DialogDescription>
          </DialogHeader>
          {orderDetail && <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-4">
              <span>Trạng thái</span><strong>{orderDetail.status}</strong>
              <span>Tạm tính</span><strong>{formatVND(orderDetail.totalAmount)}</strong>
              <span>Voucher</span><strong>{orderDetail.couponCode || "Không sử dụng"}</strong>
              <span>Giảm giá</span><strong>-{formatVND(orderDetail.discountAmount)}</strong>
              <span>Thanh toán</span><strong className="text-primary">{formatVND(orderDetail.finalAmount)}</strong>
            </div>
            <div className="space-y-2">
              {orderDetail.items.map((item) => <div key={item.id} className="rounded-xl border p-3 flex justify-between gap-3">
                <div><strong>{item.courseName}</strong><p className="text-xs text-muted-foreground">{item.packageName}</p></div>
                <div className="text-right"><span>{formatVND(item.finalPrice)}</span><p className="text-xs text-muted-foreground">Giảm {formatVND(item.discountSnapshot)}</p></div>
              </div>)}
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};
