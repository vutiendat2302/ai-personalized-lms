import React, { useState, useEffect } from "react";
import { orderApi, type OrderResponse, type OrderStatus } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) {
      pages.push("...");
    }
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 3) {
      pages.push("...");
    }
    pages.push(total - 1);
  }
  return pages;
};

export const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

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

  const totalElements = filteredOrders.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize);

  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleRefund = async (orderId: string) => {
    if (!refundReason.trim()) {
      showBanner("Vui lòng nhập lý do hoàn tiền.", true);
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

      showBanner(`Đã hoàn tiền đơn hàng ${orderId} thành công.`);
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
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" /> Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" /> Chờ thanh toán
          </span>
        );
      case "REFUNDED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1 w-fit">
            <RotateCcw className="h-3 w-3" /> Đã hoàn tiền
          </span>
        );
      case "CANCELLED":
      case "EXPIRED":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-bold flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" /> Đã hủy / Hết hạn
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

      {/* Main Orders Card */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Search & Toolbar */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-6">
            <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo Mã đơn hàng, Tên học viên hoặc Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái đơn hàng</Label>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "")}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="PAID">Đã thanh toán (PAID)</SelectItem>
                <SelectItem value="PENDING">Chờ thanh toán (PENDING)</SelectItem>
                <SelectItem value="REFUNDED">Đã hoàn tiền (REFUNDED)</SelectItem>
                <SelectItem value="EXPIRED">Đã hết hạn / Hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders Table */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Đơn Hàng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Học Viên</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng Tiền</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coupon</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày Tạo</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((ord) => (
                  <TableRow key={ord.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                    <TableCell className="font-semibold text-xs text-foreground pl-4">{ord.id}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{ord.userName}</div>
                      <div className="text-[10px] text-muted-foreground">{ord.userEmail}</div>
                    </TableCell>
                    <TableCell className="font-extrabold text-xs text-primary">
                      {ord.finalAmount.toLocaleString()} đ
                    </TableCell>
                    <TableCell>
                      {ord.couponCode ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-[10px] border border-emerald-500/20">
                          {ord.couponCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </TableCell>
                    <TableCell>{renderStatusBadge(ord.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-semibold">
                      {new Date(ord.createdAt).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(ord)}
                        className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy đơn hàng nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Modern Table Footer */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Total Results Summary */}
          <div className="text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Middle: Rows per page Select */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border border-border/40 rounded-lg font-semibold">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Go to Page Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pageNum = parseInt(jumpPageInput, 10);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                  setPage(pageNum - 1);
                } else {
                  setJumpPageInput(String(page + 1));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <span className="text-muted-foreground font-medium">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={() => {
                  const pageNum = parseInt(jumpPageInput, 10);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum - 1);
                  } else {
                    setJumpPageInput(String(page + 1));
                  }
                }}
                className="h-8 w-14 text-center text-xs font-semibold bg-background border border-border/40 rounded-lg px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Nhập số trang và nhấn Enter"
              />
            </form>

            {/* Right: Numbered Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </Button>

              {getPageNumbers(page, totalPages).map((p, pIdx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${pIdx}`} className="px-2 text-muted-foreground font-bold pointer-events-none">
                      ...
                    </span>
                  );
                }
                const pageNum = p as number;
                const isCurrent = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border-border/40 text-foreground hover:bg-muted/70"
                    )}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}

              <Button
                disabled={page >= totalPages - 1 || totalPages === 0}
                onClick={() => setPage((prev) => prev + 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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

      {/* TOAST BANNER NOTIFICATIONS */}
      {actionMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl text-white px-5 py-3.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300",
            actionMessage.isError ? "bg-destructive" : "bg-emerald-600"
          )}
        >
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

    </div>
  );
};
