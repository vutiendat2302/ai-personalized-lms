import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi, type StudentOrderItem } from "@/api/student/studentApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Receipt, Download, RefreshCcw, ArrowUpRight, X } from "lucide-react";

export const StudentOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [orders, setOrders] = useState<StudentOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ORDERS" | "REQUESTS">("ORDERS");
  const [selectedOrder, setSelectedOrder] = useState<StudentOrderItem | null>(null);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    studentApi.getOrders().then((res) => {
      setOrders(res);
      setLoading(false);
    });
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !refundReason.trim()) return;
    await studentApi.requestRefund(selectedOrder.id, refundReason);
    success("Đã gửi yêu cầu hoàn tiền thành công! HR & Admin sẽ xem xét trong vòng 24h.");
    setShowRefundModal(false);
    setRefundReason("");
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải lịch sử đơn hàng của bạn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Đơn hàng của tôi (Order History)
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi lịch sử đơn hàng, tải hóa đơn PDF, yêu cầu hoàn tiền và theo dõi tiến trình đổi lớp/giảng viên.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab("ORDERS")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "ORDERS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lịch sử Đơn hàng ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("REQUESTS")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "REQUESTS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Yêu cầu Đổi lớp / Đổi giảng viên
        </button>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === "ORDERS" && (
        <div className="space-y-4">
          {orders.map((ord) => (
            <Card key={ord.id} className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
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

              <div className="space-y-1 text-xs text-foreground">
                {ord.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-muted/30 rounded-lg">
                    <span className="font-semibold">{it.courseName} — ({it.packageName})</span>
                    <span className="font-mono text-muted-foreground">{formatVND(it.price)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => success("Đang tải Hóa đơn PDF cho đơn hàng...")}
                  className="text-xs border-border text-foreground hover:bg-muted cursor-pointer gap-1.5 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải hóa đơn PDF
                </Button>

                <div className="flex items-center gap-2">
                  {ord.status === "PAID" && ord.isEligibleForRefund && (
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
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: APPROVAL REQUESTS */}
      {activeTab === "REQUESTS" && (
        <Card className="bg-card border-border/40 p-5 space-y-3 shadow-xs text-xs text-muted-foreground">
          <h3 className="font-bold text-foreground">Theo dõi yêu cầu Đổi lớp / Đổi giảng viên</h3>
          <p>Hiện không có yêu cầu chuyển lớp nào đang chờ duyệt.</p>
        </Card>
      )}

      {/* Refund Request Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground">Yêu cầu hoàn tiền đơn {selectedOrder.id}</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
              <p className="text-muted-foreground">
                Vui lòng nhập lý do muốn hoàn tiền. Đơn hàng còn trong hạn bảo hành refund.
              </p>

              <textarea
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-background border border-border rounded-xl p-3 text-foreground"
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  className="text-xs border-border text-foreground cursor-pointer"
                >
                  Hủy
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer">
                  Gửi yêu cầu hoàn tiền
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
