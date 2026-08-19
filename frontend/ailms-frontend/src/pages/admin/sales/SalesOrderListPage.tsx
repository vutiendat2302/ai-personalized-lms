import React, { useState, useEffect } from "react";
import { salesApi, type OrderDetail, type OrderStatusEnum } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  MoreVertical,
  Copy,
  Check,
  Eye,
  XCircle,
  Send,
  FileDown,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/useToast";

export const SalesOrderListPage: React.FC = () => {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced Filters State
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasCoupon, setHasCoupon] = useState<string>("ALL");

  // Action Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getOrders();
      setOrders(data);
    } catch (err) {
      error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success(`Đã sao chép Snowflake ID: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    // Status Filter
    if (statusFilter !== "ALL" && order.status !== statusFilter) {
      return false;
    }

    // 1-Input Smart Search (order id, snowflake id, student name, phone, email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = order.id.toLowerCase().includes(term) || order.snowflakeId.toLowerCase().includes(term);
      const matchName = order.userName.toLowerCase().includes(term);
      const matchPhone = order.userPhone.toLowerCase().includes(term);
      const matchEmail = order.userEmail.toLowerCase().includes(term);
      if (!matchId && !matchName && !matchPhone && !matchEmail) {
        return false;
      }
    }

    // Advanced Filters
    if (minPrice && order.finalAmount < Number(minPrice)) return false;
    if (maxPrice && order.finalAmount > Number(maxPrice)) return false;
    if (hasCoupon === "YES" && !order.couponCode) return false;
    if (hasCoupon === "NO" && order.couponCode) return false;

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Danh sách Đơn hàng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý, tra cứu, đối soát & thực hiện nghiệp vụ xử lý đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg gap-2 text-xs font-semibold cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* 1-Input Smart Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search theo Mã đơn / Tên học viên / SĐT / Email (ô tìm kiếm thông minh)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card rounded-lg text-xs h-10 border-border/60"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="rounded-lg gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            Bộ lọc nâng cao
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "PENDING", label: "Chờ thanh toán" },
            { key: "PAID", label: "Đã thanh toán" },
            { key: "CANCELLED", label: "Đã hủy" },
            { key: "REFUNDED", label: "Hoàn tiền" },
            { key: "EXPIRED", label: "Hết hạn" },
          ].map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === chip.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvanced && (
          <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Giá tối thiểu (VNĐ)</label>
              <Input
                type="number"
                placeholder="VD: 1000000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-8 text-xs bg-card"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Giá tối đa (VNĐ)</label>
              <Input
                type="number"
                placeholder="VD: 5000000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-8 text-xs bg-card"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Mã Coupon</label>
              <select
                value={hasCoupon}
                onChange={(e) => setHasCoupon(e.target.value)}
                className="h-8 w-full text-xs bg-card border border-border/60 rounded-md px-2 text-foreground"
              >
                <option value="ALL">Tất cả</option>
                <option value="YES">Có áp dụng Coupon</option>
                <option value="NO">Không dùng Coupon</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="pt-2 border-t border-border/40 flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-lg text-xs">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              Đã chọn {selectedOrderIds.length} đơn hàng
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs bg-card font-semibold rounded-md">
                Xuất Excel đã chọn
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs font-semibold rounded-md">
                Hủy hàng loạt (chỉ PENDING)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-border cursor-pointer"
                />
              </TableHead>
              <TableHead className="font-bold text-xs">Mã đơn</TableHead>
              <TableHead className="font-bold text-xs">Học viên</TableHead>
              <TableHead className="font-bold text-xs">Sản phẩm (Tóm tắt)</TableHead>
              <TableHead className="font-bold text-xs">Tổng tiền</TableHead>
              <TableHead className="font-bold text-xs">Trạng thái</TableHead>
              <TableHead className="font-bold text-xs">Ngày tạo</TableHead>
              <TableHead className="font-bold text-xs text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Không tìm thấy đơn hàng phù hợp</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const mainItem = order.items[0];
                const extraItemsCount = order.items.length - 1;

                return (
                  <TableRow key={order.id} className="border-b border-border/30 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(order.id)}
                        className="rounded border-border cursor-pointer"
                      />
                    </TableCell>

                    {/* Snowflake ID */}
                    <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/sales/orders/${order.id}`} className="hover:underline">
                          {order.snowflakeId}
                        </Link>
                        <button
                          onClick={() => copyToClipboard(order.id, order.id)}
                          title="Copy Full ID"
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {copiedId === order.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* Student Info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {order.userAvatar ? (
                            <img src={order.userAvatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            order.userName.charAt(0)
                          )}
                        </div>
                        <div className="truncate max-w-[160px]">
                          <p className="text-xs font-bold text-foreground truncate">{order.userName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{order.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Product Summary */}
                    <TableCell>
                      <div className="text-xs font-medium text-foreground max-w-[220px]">
                        <p className="truncate">{mainItem?.packageName || mainItem?.courseName || "Khóa học"}</p>
                        {extraItemsCount > 0 && (
                          <span
                            title={order.items.map((it) => it.packageName).join("\n")}
                            className="inline-block text-[10px] text-indigo-600 dark:text-indigo-400 font-bold underline cursor-help"
                          >
                            +{extraItemsCount} sản phẩm khác
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Total Amount */}
                    <TableCell className="font-bold text-xs text-foreground">
                      <div>
                        {formatVND(order.finalAmount)}
                        {order.discountAmount > 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium">Giảm {formatVND(order.discountAmount)}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <div className="relative inline-block text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveMenuId(activeMenuId === order.id ? null : order.id)}
                          className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        {activeMenuId === order.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-card border border-border/60 rounded-xl shadow-lg z-20 py-1 text-xs">
                            <Link
                              to={`/sales/orders/${order.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted font-medium"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-600" />
                              Xem chi tiết
                            </Link>

                            {order.status === "PENDING" && (
                              <>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium cursor-pointer"
                                  onClick={async () => {
                                    await salesApi.cancelOrder(order.id, "Admin hủy đơn");
                                    success(`Đã hủy đơn hàng ${order.snowflakeId}`);
                                    setActiveMenuId(null);
                                    fetchOrders();
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Hủy đơn hàng
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium cursor-pointer"
                                  onClick={() => {
                                    success("Đã gửi lại link thanh toán qua Email & Zalo cho học viên!");
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Gửi lại link thanh toán
                                </button>
                              </>
                            )}

                            {order.status === "PAID" && (
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-muted font-medium cursor-pointer"
                                onClick={() => {
                                  success("Đã khởi tạo và tải hóa đơn PDF!");
                                  setActiveMenuId(null);
                                }}
                              >
                                <FileDown className="h-3.5 w-3.5" />
                                Xuất hóa đơn PDF
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
