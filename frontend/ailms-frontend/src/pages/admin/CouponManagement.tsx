import React, { useState, useEffect } from "react";
import { orderApi, type CouponResponse, type DiscountType } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Tag,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  TrendingUp,
  Check,
  Loader2,
  TicketX,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";

const getPageNumbers = (currentPage: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("...");
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(total - 2, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < total - 3) pages.push("...");
    pages.push(total - 1);
  }
  return pages;
};

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "VALUE_DESC" | "USAGE_DESC" | "EXPIRING_SOON">("NEWEST");

  // Modals & States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponResponse | null>(null);
  const [viewDetailCoupon, setViewDetailCoupon] = useState<CouponResponse | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>("PERCENT");
  const [formValue, setFormValue] = useState<number>(20);
  const [formMaxUsage, setFormMaxUsage] = useState<number>(100);
  const [formValidFrom, setFormValidFrom] = useState("2026-01-01");
  const [formValidTo, setFormValidTo] = useState("2026-12-31");
  const [formCourseName, setFormCourseName] = useState("Tất cả các khóa học");
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getCoupons();
      if (res.data && Array.isArray(res.data.data)) {
        setCoupons(res.data.data);
      } else {
        setCoupons([]);
      }
    } catch (e) {
      console.error("Error fetching coupons:", e);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("NEWEST");
    setPage(0);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode(`PROMO${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDiscountType("PERCENT");
    setFormValue(20);
    setFormMaxUsage(100);
    setFormValidFrom(new Date().toISOString().split("T")[0]);
    setFormValidTo(new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split("T")[0]);
    setFormCourseName("Tất cả các khóa học");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cp: CouponResponse) => {
    setEditingCoupon(cp);
    setFormCode(cp.code);
    setFormDiscountType(cp.discountType);
    setFormValue(cp.value);
    setFormMaxUsage(cp.maxUsage);
    setFormValidFrom(cp.validFrom || "2026-01-01");
    setFormValidTo(cp.validTo || "2026-12-31");
    setFormCourseName(cp.applicableCourseName || "Tất cả các khóa học");
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      showBanner("Vui lòng nhập Mã Code giảm giá!", true);
      return;
    }

    setSubmitting(true);
    try {
      if (editingCoupon) {
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === editingCoupon.id
              ? {
                  ...c,
                  code: formCode.toUpperCase().trim(),
                  discountType: formDiscountType,
                  value: formValue,
                  maxUsage: formMaxUsage,
                  validFrom: formValidFrom,
                  validTo: formValidTo,
                  applicableCourseName: formCourseName,
                }
              : c
          )
        );
        showBanner(`Cập nhật mã [${formCode.toUpperCase()}] thành công!`);
      } else {
        const newCoupon: CouponResponse = {
          id: `cp-${Date.now()}`,
          code: formCode.toUpperCase().trim(),
          discountType: formDiscountType,
          value: formValue,
          usedCount: 0,
          maxUsage: formMaxUsage,
          validFrom: formValidFrom,
          validTo: formValidTo,
          status: "ACTIVE",
          applicableCourseName: formCourseName,
        };
        setCoupons((prev) => [newCoupon, ...prev]);
        showBanner(`Tạo mới mã giảm giá [${formCode.toUpperCase()}] thành công!`);
      }

      setIsModalOpen(false);
    } catch (err) {
      showBanner("Lỗi khi lưu mã giảm giá!", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (cp: CouponResponse) => {
    const newStatus = cp.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setCoupons((prev) =>
      prev.map((c) => (c.id === cp.id ? { ...c, status: newStatus as any } : c))
    );
    showBanner(`Đã đổi trạng thái mã [${cp.code}] thành ${newStatus === "ACTIVE" ? "Hoạt động" : "Bị Tắt"}.`);
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteCouponId) return;
    try {
      await orderApi.deleteCoupon(deleteCouponId);
    } catch {
      // ignore
    }
    setCoupons((prev) => prev.filter((c) => c.id !== deleteCouponId));
    showBanner("Đã xóa mã giảm giá thành công.");
    setDeleteCouponId(null);
  };

  const handleCopyCode = (cpCode: string) => {
    navigator.clipboard.writeText(cpCode);
    setCopiedCode(cpCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter & Sort Logic
  const filteredCoupons = coupons.filter((cp) => {
    const matchesSearch =
      cp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cp.applicableCourseName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "ALL" ? true : cp.discountType === typeFilter;
    const matchesStatus = statusFilter === "ALL" ? true : cp.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedCoupons = [...filteredCoupons].sort((a, b) => {
    if (sortBy === "VALUE_DESC") return b.value - a.value;
    if (sortBy === "USAGE_DESC") return (b.usedCount || 0) - (a.usedCount || 0);
    if (sortBy === "EXPIRING_SOON") return new Date(a.validTo).getTime() - new Date(b.validTo).getTime();
    return new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime();
  });

  const totalElements = sortedCoupons.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedCoupons = sortedCoupons.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 ${
            actionMessage.isError
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar (Styled exactly like RoleManagement.tsx) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            <span>Quản Lý Mã Giảm Giá & Voucher (Coupon Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản trị trung tâm các chương trình ưu đãi chiết khấu học phí, tỷ lệ lượt dùng và khóa học áp dụng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCoupons} variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button onClick={handleOpenCreateModal} size="sm" className="rounded-xl gap-1 font-semibold bg-primary text-primary-foreground cursor-pointer">
            <Plus className="h-4 w-4" /> Tạo Coupon Mới
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards (Styled exactly like RoleManagement.tsx KPI Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
            <Tag className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Tổng Số Mã Coupon
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground flex items-center gap-2 mt-1">
              <span className="text-primary">{coupons.length}</span>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Coupons</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Tổng các chương trình khuyến mãi đã phát hành</p></CardContent>
        </Card>

        <Card className="border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
            <CheckCircle2 className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Mã Đang Hoạt Động
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600 flex items-center gap-2 mt-1">
              <span>{coupons.filter((c) => c.status === "ACTIVE").length}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Active</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Mã sẵn sàng áp dụng khi học viên thanh toán</p></CardContent>
        </Card>

        <Card className="border-border shadow-xs bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600">
            <TrendingUp className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase">
              Tổng Lượt Đã Sử Dụng
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-indigo-600 flex items-center gap-2 mt-1">
              <span>{coupons.reduce((acc, cur) => acc + (cur.usedCount || 0), 0)}</span>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">Lượt dùng</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Tổng số lượt coupon đã áp dụng thành công</p></CardContent>
        </Card>

        <Card className="border-2 border-amber-500/40 bg-linear-to-br from-amber-500/10 via-card to-card shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-extrabold text-amber-600 uppercase flex items-center justify-between">
              <span className="flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Bị Tắt / Hết Hạn</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black">CẢNH BÁO</span>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600 flex items-center gap-2 mt-1">
              <span>{coupons.filter((c) => c.status !== "ACTIVE").length}</span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Ngưng dùng</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0"><p className="text-xs text-muted-foreground">Cần kiểm tra gia hạn hoặc kích hoạt lại</p></CardContent>
        </Card>
      </div>

      {/* Main Coupons Control Table Card (Identical layout to RoleManagement.tsx Data Table) */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Search, Filter & Sort Toolbar */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-4">
            <Label className="text-[11px] font-bold text-muted-foreground">Tìm kiếm mã / Khóa học</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm mã Code hoặc tên khóa học..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Loại giảm giá</Label>
            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả các loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả các loại</SelectItem>
                <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                <SelectItem value="FIXED">Số tiền cố định (VNĐ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-2">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="DISABLED">Bị tắt</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
              <span>Sắp xếp theo</span>
              {(searchTerm || typeFilter !== "ALL" || statusFilter !== "ALL" || sortBy !== "NEWEST") && (
                <button onClick={handleResetFilters} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  <RotateCcw className="h-2.5 w-2.5" /> Đặt lại
                </button>
              )}
            </Label>
            <Select value={sortBy} onValueChange={(val) => setSortBy((val as any) || "NEWEST")}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Mới nhất" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWEST">Mới nhất (Ngày tạo)</SelectItem>
                <SelectItem value="VALUE_DESC">Mức giảm cao nhất</SelectItem>
                <SelectItem value="USAGE_DESC">Lượt sử dụng nhiều nhất</SelectItem>
                <SelectItem value="EXPIRING_SOON">Gần hết hạn nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Coupon</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loại & Mức Giảm</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Khóa Học Áp Dụng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tiến Độ Lượt Dùng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thời Gian Hiệu Lực</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác Quản Lý</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-muted-foreground">Đang tải mã giảm giá từ API backend...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedCoupons.length > 0 ? (
                paginatedCoupons.map((cp) => {
                  const usagePercent = cp.maxUsage ? Math.min(100, Math.round(((cp.usedCount || 0) / cp.maxUsage) * 100)) : 0;
                  return (
                    <TableRow key={cp.id} className="hover:bg-foreground/10 transition-colors border-border/30">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-extrabold border border-primary/20 text-xs tracking-wider font-mono">
                            {cp.code || "N/A"}
                          </span>
                          <Button
                            onClick={() => handleCopyCode(cp.code || "")}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:bg-muted cursor-pointer"
                            title="Sao chép mã"
                          >
                            {copiedCode === cp.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-extrabold text-xs text-emerald-600 block">
                          {cp.discountType === "PERCENT" ? `Giảm ${cp.value}%` : `Giảm ${(cp.value || 0).toLocaleString()} VNĐ`}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {cp.discountType === "PERCENT" ? "Theo phần trăm" : "Số tiền cố định"}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-foreground max-w-45 truncate">
                        {cp.applicableCourseName || "Tất cả các khóa học"}
                      </TableCell>

                      <TableCell className="min-w-35">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span>{cp.usedCount || 0}/{cp.maxUsage || 0} lượt</span>
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

                      <TableCell className="text-muted-foreground text-xs font-semibold">
                        {cp.validFrom || "N/A"} → {cp.validTo || "N/A"}
                      </TableCell>

                      <TableCell>
                        <button
                          onClick={() => handleToggleStatus(cp)}
                          className="flex items-center gap-1.5 cursor-pointer"
                          title="Bấm để bật/tắt trạng thái"
                        >
                          {cp.status === "ACTIVE" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold border border-emerald-500/20 flex items-center gap-1">
                              <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> Hoạt động
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 text-[10px] font-extrabold border border-slate-500/20 flex items-center gap-1">
                              <ToggleLeft className="h-3.5 w-3.5 text-slate-500" /> Bị Tắt / Hết hạn
                            </span>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => setViewDetailCoupon(cp)}
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            onClick={() => handleOpenEditModal(cp)}
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => setDeleteCouponId(cp.id)}
                            variant="ghost"
                            size="icon"
                            title="Xóa"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                    <TicketX className="h-10 w-10 mx-auto mb-2 text-primary opacity-80" />
                    <p className="text-sm font-bold text-foreground mb-1">Không tìm thấy mã giảm giá nào</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Hệ thống chưa ghi nhận mã giảm giá nào từ API backend hoặc bộ lọc tìm kiếm. Bấm "Tạo Coupon Mới" để tạo mã đầu tiên!
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Modern Table Footer (Identical structure to RoleManagement.tsx) */}
        <div className="px-5 py-3 border-t border-border/40 bg-card/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{totalElements === 0 ? 0 : page * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min((page + 1) * pageSize, totalElements)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalElements}</span> results
          </div>

          <div className="flex flex-wrap items-center gap-5">
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
                </SelectContent>
              </Select>
            </div>

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

            <div className="flex items-center gap-1">
              <Button
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted cursor-pointer"
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
                      "h-8 min-w-8 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
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
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border/40 rounded-lg hover:bg-muted cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">
                  {editingCoupon ? `Chỉnh Sửa Mã Coupon [${editingCoupon.code}]` : "Tạo Mới Mã Giảm Giá (Coupon)"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mã Code (Coupon Code)</Label>
                  <Input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="E.g. AILMS2026"
                    className="h-9 text-xs font-mono font-bold tracking-wider"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Loại Giảm Giá</Label>
                  <Select value={formDiscountType} onValueChange={(val) => setFormDiscountType((val as DiscountType) || "PERCENT")}>
                    <SelectTrigger className="h-9 text-xs font-semibold">
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                      <SelectItem value="FIXED">Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">
                    {formDiscountType === "PERCENT" ? "Mức Giảm (%)" : "Mức Giảm (VNĐ)"}
                  </Label>
                  <Input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(Number(e.target.value))}
                    placeholder={formDiscountType === "PERCENT" ? "E.g. 20" : "E.g. 500000"}
                    className="h-9 text-xs font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Sĩ Số Lượt Dùng Tối Đa</Label>
                  <Input
                    type="number"
                    value={formMaxUsage}
                    onChange={(e) => setFormMaxUsage(Number(e.target.value))}
                    placeholder="E.g. 100"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Ngày Bắt Đầu Hiệu Lực</Label>
                  <Input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Ngày Hết Hạn</Label>
                  <Input
                    type="date"
                    value={formValidTo}
                    onChange={(e) => setFormValidTo(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Khóa Học Áp Dụng</Label>
                <Input
                  type="text"
                  value={formCourseName}
                  onChange={(e) => setFormCourseName(e.target.value)}
                  placeholder="Tất cả các khóa học hoặc tên khóa học cụ thể..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs border-border text-foreground cursor-pointer"
                >
                  Hủy Bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer"
                >
                  {submitting ? "Đang xử lý..." : editingCoupon ? "Cập Nhật Coupon" : "Tạo Mới Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewDetailCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">Chi Tiết Mã Coupon [{viewDetailCoupon.code}]</h3>
              </div>
              <button onClick={() => setViewDetailCoupon(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Mã Giảm Giá</span>
                  <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-extrabold font-mono text-sm border border-primary/20">
                    {viewDetailCoupon.code}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Mức giảm:</span>
                  <strong className="text-emerald-600 font-extrabold text-sm">
                    {viewDetailCoupon.discountType === "PERCENT"
                      ? `Giảm ${viewDetailCoupon.value}%`
                      : `Giảm ${(viewDetailCoupon.value || 0).toLocaleString()} VNĐ`}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Đã sử dụng:</span>
                  <strong className="text-foreground">{viewDetailCoupon.usedCount || 0} / {viewDetailCoupon.maxUsage || 0} lượt</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thời hạn:</span>
                  <strong className="text-foreground">{viewDetailCoupon.validFrom} → {viewDetailCoupon.validTo}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Áp dụng cho:</span>
                  <strong className="text-foreground">{viewDetailCoupon.applicableCourseName || "Toàn hệ thống"}</strong>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setViewDetailCoupon(null)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl cursor-pointer"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteCouponId)}
        onOpenChange={(open) => {
          if (!open) setDeleteCouponId(null);
        }}
        title="Xác nhận xóa mã giảm giá"
        description="Bạn có chắc chắn muốn xóa vĩnh viễn mã giảm giá này? Thao tác này không thể hoàn tác."
        confirmText="Xóa Mã Coupon"
        cancelText="Hủy Bỏ"
        onConfirm={confirmDeleteCoupon}
      />
    </div>
  );
};
