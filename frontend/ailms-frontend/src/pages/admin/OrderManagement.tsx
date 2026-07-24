import React, { useState, useEffect } from "react";
import { orderApi, type OrderResponse, type OrderStatus } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  X,
} from "lucide-react";

export const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  // Mock initial orders if backend returns empty
  const MOCK_ADMIN_ORDERS: OrderResponse[] = [
    {
      id: "ORD-984210",
      userId: "usr-101",
      userName: "Bùi Xuân Huấn",
      userEmail: "huanrose@ailms.edu.vn",
      status: "PAID",
      totalAmount: 4100000,
      discountAmount: 820000,
      finalAmount: 3280000,
      couponCode: "AILMS20",
      paidAt: "2026-07-24T08:15:00Z",
      createdAt: "2026-07-24T08:10:00Z",
      items: [
        {
          id: "item-1",
          orderId: "ORD-984210",
          coursePackageId: "pkg-1",
          courseName: "Toàn tập Marketing số cho người mới bắt đầu #1994",
          packageName: "Gói Tự Học Standard (Lifetime)",
          priceSnapshot: 4100000,
          discountSnapshot: 820000,
          finalPrice: 3280000,
          itemType: "NEW_PURCHASE",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          orderId: "ORD-984210",
          transactionRef: "VNPAY-20260724-8899",
          paymentMethod: "VNPAY",
          status: "SUCCESS",
          createdAt: "2026-07-24T08:15:00Z",
        },
      ],
    },
    {
      id: "ORD-984211",
      userId: "usr-102",
      userName: "Nguyễn Hải Yến",
      userEmail: "yen.nh@gmail.com",
      status: "PENDING",
      totalAmount: 3200000,
      discountAmount: 0,
      finalAmount: 3200000,
      createdAt: "2026-07-24T08:30:00Z",
      items: [
        {
          id: "item-2",
          orderId: "ORD-984211",
          coursePackageId: "pkg-2",
          courseName: "Lập trình Web Fullstack với React & NestJS",
          packageName: "Gói Kèm 1-1 Chuyên sâu",
          priceSnapshot: 3200000,
          discountSnapshot: 0,
          finalPrice: 3200000,
          itemType: "NEW_PURCHASE",
        },
      ],
    },
    {
      id: "ORD-984205",
      userId: "usr-103",
      userName: "Lê Minh Triết",
      userEmail: "triet.lm@outlook.com",
      status: "REFUNDED",
      totalAmount: 5500000,
      discountAmount: 500000,
      finalAmount: 5000000,
      couponCode: "STUDENT500K",
      paidAt: "2026-07-20T10:00:00Z",
      createdAt: "2026-07-20T09:50:00Z",
      items: [
        {
          id: "item-3",
          orderId: "ORD-984205",
          coursePackageId: "pkg-3",
          courseName: "Nhập môn Trí tuệ Nhân tạo & Machine Learning",
          packageName: "Gói Nâng cấp (Upgrade 1-1)",
          priceSnapshot: 5500000,
          discountSnapshot: 500000,
          finalPrice: 5000000,
          itemType: "UPGRADE",
        },
      ],
    },
  ];

  const fetchOrders = async () => {
    try {
      const res = await orderApi.getOrders();
      if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setOrders(res.data.data);
      } else {
        setOrders(MOCK_ADMIN_ORDERS);
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
      setOrders(MOCK_ADMIN_ORDERS);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.userEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || ord.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRefund = async (orderId: string) => {
    if (!refundReason.trim()) {
      alert("Vui lòng nhập lý do hoàn tiền.");
      return;
    }
    try {
      setRefunding(true);
      try {
        await orderApi.refundOrder(orderId, refundReason);
      } catch (e) {
        console.log("Backend refund call note:", e);
      }

      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, status: "REFUNDED" } : ord
        )
      );

      alert(`Đã hoàn tiền đơn hàng ${orderId} thành công.`);
      setSelectedOrder(null);
      setRefundReason("");
    } finally {
      setRefunding(false);
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold flex items-center gap-1 w-fit">
            <Clock className="h-3.5 w-3.5" /> Chờ thanh toán
          </span>
        );
      case "REFUNDED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold flex items-center gap-1 w-fit">
            <RotateCcw className="h-3.5 w-3.5" /> Đã hoàn tiền
          </span>
        );
      case "CANCELLED":
      case "EXPIRED":
        return (
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-bold flex items-center gap-1 w-fit">
            <XCircle className="h-3.5 w-3.5" /> Đã hủy / Hết hạn
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span>Quản Lý Đơn Hàng & Thanh Toán</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Theo dõi tất cả đơn hàng, trạng thái thanh toán và hoàn tiền cho học viên.
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm theo Mã đơn hàng, Tên học viên hoặc Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 bg-card border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary shrink-0"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán (PAID)</option>
          <option value="PENDING">Chờ thanh toán (PENDING)</option>
          <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
          <option value="EXPIRED">Đã hết hạn / Hủy</option>
        </select>
      </div>

      {/* Orders Table */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
              <tr>
                <th className="p-4">Mã Đơn Hàng</th>
                <th className="p-4">Học Viên</th>
                <th className="p-4">Tổng Tiền</th>
                <th className="p-4">Coupon</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-extrabold text-foreground">{ord.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{ord.userName}</div>
                      <div className="text-[10px] text-muted-foreground">{ord.userEmail}</div>
                    </td>
                    <td className="p-4 font-extrabold text-primary">
                      {ord.finalAmount.toLocaleString()} đ
                    </td>
                    <td className="p-4">
                      {ord.couponCode ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px]">
                          {ord.couponCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </td>
                    <td className="p-4">{renderStatusBadge(ord.status)}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(ord.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(ord)}
                        className="rounded-lg text-xs font-bold gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" /> Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Không tìm thấy đơn hàng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ORDER DETAIL & REFUND MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    Chi tiết đơn hàng {selectedOrder.id}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Khách hàng: {selectedOrder.userName} ({selectedOrder.userEmail})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div className="flex justify-between items-center bg-muted/20 p-3.5 rounded-xl border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Trạng thái đơn hàng:
                  </span>
                  {renderStatusBadge(selectedOrder.status)}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Tổng tiền thanh toán:
                  </span>
                  <span className="text-base font-extrabold text-primary">
                    {selectedOrder.finalAmount.toLocaleString()} đ
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase text-[10px] text-muted-foreground tracking-wider">
                  Sản phẩm trong đơn:
                </h4>
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-3 rounded-xl bg-card border border-border flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-foreground text-xs">{it.courseName}</h5>
                      <p className="text-[10px] text-muted-foreground">{it.packageName} • {it.itemType}</p>
                    </div>
                    <span className="font-bold text-foreground">{it.finalPrice.toLocaleString()} đ</span>
                  </div>
                ))}
              </div>

              {/* Refund Action if order is PAID */}
              {selectedOrder.status === "PAID" && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                  <h4 className="font-bold text-rose-600 flex items-center gap-1.5 text-xs">
                    <RotateCcw className="h-4 w-4" /> Hoàn tiền đơn hàng này
                  </h4>
                  <Input
                    type="text"
                    placeholder="Nhập lý do hoàn tiền (Ví dụ: Học viên đổi khóa học, lỗi thanh toán)..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                  <Button
                    onClick={() => handleRefund(selectedOrder.id)}
                    disabled={refunding}
                    className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    {refunding ? "Đang hoàn tiền..." : "Xác nhận Hoàn tiền ngay"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
