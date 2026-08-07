import React, { useState, useEffect } from "react";
import { salesApi, type CouponItem } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { ShopeeTicketCard, type VoucherTicketData } from "@/components/common/ShopeeTicketCard";
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
  Tag,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Grid,
  List,
  Loader2,
  TicketX,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const SalesCouponListPage: React.FC = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getCoupons();
      setCoupons(data || []);
    } catch (err) {
      console.error("Error fetching coupons:", err);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "--";
    return new Date(isoStr).toLocaleDateString("vi-VN");
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            <span>Quản lý Mã giảm giá (Coupons & Vouchers)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dữ liệu trực tiếp từ API backend hệ thống, hỗ trợ xem dạng Thẻ Vé Smart Voucher và Dạng Bảng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode("GRID")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Grid className="h-3.5 w-3.5" /> Giao diện Thẻ Vé
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <List className="h-3.5 w-3.5" /> Dạng Bảng
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCoupons}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/sales/coupons/new">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-2 cursor-pointer text-xs font-semibold shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              Tạo Coupon mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo Mã Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <Card className="p-16 border border-border/40 rounded-2xl bg-card flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Đang tải danh sách mã giảm giá từ API backend...</p>
        </Card>
      ) : filteredCoupons.length === 0 ? (
        /* EMPTY STATE: NO COUPONS FOUND */
        <Card className="p-16 border border-border/40 rounded-2xl bg-card text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <TicketX className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-foreground">Không tìm thấy mã giảm giá nào</h3>
            <p className="text-xs text-muted-foreground">
              {searchTerm
                ? `Không có mã giảm giá nào khớp với từ khóa "${searchTerm}".`
                : "Hệ thống chưa ghi nhận mã giảm giá nào từ API backend. Bấm nút dưới đây để tạo mã giảm giá đầu tiên!"}
            </p>
          </div>
          <Link to="/sales/coupons/new">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-sm">
              <Plus className="h-4 w-4" />
              Tạo Coupon Mới Đầu Tiên
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* GRID VIEW (SMART VOUCHER TICKET CARDS) */}
          {viewMode === "GRID" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCoupons.map((coupon, idx) => {
                const ticketData: VoucherTicketData = {
                  id: coupon.id,
                  code: coupon.code,
                  title: coupon.discountType === "PERCENT" ? `Giảm ${coupon.value}%` : `Giảm ${formatVND(coupon.value)}`,
                  discountType: coupon.discountType,
                  value: coupon.value,
                  maxDiscountText: coupon.discountType === "PERCENT" ? `Giảm tối đa ${formatVND(coupon.value * 10000)}` : `Giảm trực tiếp ${formatVND(coupon.value)}`,
                  minOrderText: `Đơn Tối Thiểu ${formatVND(coupon.minOrderAmount || 0)}`,
                  expiryText: `HSD: ${formatDate(coupon.validTo)}`,
                  badgeText: coupon.discountType === "PERCENT" ? "Hot" : "Voucher",
                  applicableCourseName: coupon.applicableCourseName,
                  isSaved: false,
                };

                return (
                  <ShopeeTicketCard
                    key={coupon.id}
                    voucher={ticketData}
                    onUseNow={() => navigate(`/sales/coupons/${coupon.id}`)}
                  />
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === "TABLE" && (
            <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="font-bold text-xs">Mã Code</TableHead>
                    <TableHead className="font-bold text-xs">Loại giảm giá</TableHead>
                    <TableHead className="font-bold text-xs">Giá trị</TableHead>
                    <TableHead className="font-bold text-xs">Áp dụng cho</TableHead>
                    <TableHead className="font-bold text-xs">Lượt dùng</TableHead>
                    <TableHead className="font-bold text-xs">Thời hạn hiệu lực</TableHead>
                    <TableHead className="font-bold text-xs">Trạng thái</TableHead>
                    <TableHead className="font-bold text-xs text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon) => {
                    const isExpiredByDate = new Date(coupon.validTo).getTime() < Date.now();
                    const computedStatus = isExpiredByDate ? "EXPIRED" : coupon.status;
                    const usagePercent = coupon.maxUsage ? Math.min(100, Math.round((coupon.usedCount / coupon.maxUsage) * 100)) : 0;

                    return (
                      <TableRow key={coupon.id} className="border-b border-border/30 hover:bg-muted/20">
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          <span className="px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20">
                            {coupon.code}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-foreground">
                          {coupon.discountType === "PERCENT" ? "Phần trăm (%)" : "Số tiền cố định (VNĐ)"}
                        </TableCell>

                        <TableCell className="text-xs font-bold text-emerald-600">
                          {coupon.discountType === "PERCENT" ? `${coupon.value}%` : formatVND(coupon.value)}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                          {coupon.applicableCourseName ? (
                            <span className="font-semibold text-foreground">{coupon.applicableCourseName}</span>
                          ) : (
                            <span className="italic">Toàn hệ thống</span>
                          )}
                        </TableCell>

                        <TableCell className="min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span>{coupon.usedCount}/{coupon.maxUsage || 0}</span>
                              <span className={usagePercent >= 90 ? "text-rose-600 font-extrabold" : "text-muted-foreground"}>
                                {usagePercent}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent >= 90 ? "bg-rose-500" : "bg-primary"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(coupon.validFrom)} → {formatDate(coupon.validTo)}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={computedStatus} />
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/sales/coupons/${coupon.id}`)}
                            className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
