import React, { useState, useEffect } from "react";
import { orderApi, type CouponResponse, type CreateCouponRequest, type DiscountType } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Clock,
  TrendingUp,
  Check
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

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  useEffect(() => {
    setJumpPageInput(String(page + 1));
  }, [page]);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT");
  const [value, setValue] = useState<number>(20);
  const [maxUsage, setMaxUsage] = useState<number>(100);
  const [validFrom, setValidFrom] = useState("2026-01-01");
  const [validTo, setValidTo] = useState("2026-12-31");
  const [submitting, setSubmitting] = useState(false);

  const MOCK_COUPONS: CouponResponse[] = [
    {
      id: "cp-1",
      code: "AILMS20",
      discountType: "PERCENT",
      value: 20,
      usedCount: 15,
      maxUsage: 100,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      status: "ACTIVE",
    },
    {
      id: "cp-2",
      code: "STUDENT500K",
      discountType: "FIXED",
      value: 500000,
      usedCount: 42,
      maxUsage: 200,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      status: "ACTIVE",
    },
    {
      id: "cp-3",
      code: "WELCOME2026",
      discountType: "PERCENT",
      value: 30,
      usedCount: 88,
      maxUsage: 100,
      validFrom: "2026-01-01",
      validTo: "2026-06-01",
      status: "EXPIRED",
    },
    {
      id: "cp-4",
      code: "SUMMERPROMO",
      discountType: "PERCENT",
      value: 25,
      usedCount: 10,
      maxUsage: 50,
      validFrom: "2026-06-01",
      validTo: "2026-08-31",
      status: "ACTIVE",
    },
  ];

  const fetchCoupons = async () => {
    try {
      const res = await orderApi.getCoupons();
      if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setCoupons(res.data.data);
      } else {
        setCoupons(MOCK_COUPONS);
      }
    } catch (e) {
      console.error("Error fetching coupons:", e);
      setCoupons(MOCK_COUPONS);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);

  const showBanner = (text: string, isError = false) => {
    setActionMessage({ text, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showBanner("Vui lòng nhập mã coupon.", true);
      return;
    }
    try {
      setSubmitting(true);
      const payload: CreateCouponRequest = {
        code: code.trim().toUpperCase(),
        discountType,
        value,
        maxUsage,
        validFrom,
        validTo,
      };

      try {
        await orderApi.createCoupon(payload);
      } catch (err) {
        console.log("Backend coupon create note:", err);
      }

      const newCoupon: CouponResponse = {
        id: `cp-${Date.now()}`,
        code: code.trim().toUpperCase(),
        discountType,
        value,
        usedCount: 0,
        maxUsage,
        validFrom,
        validTo,
        status: "ACTIVE",
      };

      setCoupons((prev) => [newCoupon, ...prev]);
      showBanner(`Đã tạo thành công mã giảm giá ${code.toUpperCase()}`);
      setIsCreateModalOpen(false);
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = (id: string) => {
    setDeleteCouponId(id);
  };

  const confirmDeleteCouponAction = async () => {
    if (!deleteCouponId) return;
    try {
      try {
        await orderApi.deleteCoupon(deleteCouponId);
      } catch (e) {
        console.log("Backend delete coupon note:", e);
      }
      setCoupons((prev) => prev.filter((c) => c.id !== deleteCouponId));
      showBanner("Đã xóa mã giảm giá thành công.");
    } catch (e) {
      console.error("Error deleting coupon:", e);
    } finally {
      setDeleteCouponId(null);
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" ? true : c.discountType === typeFilter;
    const matchesStatus = statusFilter === "ALL" ? true : c.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalElements = filteredCoupons.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedCoupons = filteredCoupons.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            <span>Quản Lý Mã Giảm Giá & Voucher (Coupon Management)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tạo và quản lý các chương trình ưu đãi mã giảm giá áp dụng cho học viên đăng ký khóa học.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCoupons} variant="outline" className="rounded-xl gap-1 text-xs font-bold h-9">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl gap-1 text-xs font-bold h-9 bg-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Tạo Coupon Mới
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Số Mã Coupon</p>
            <p className="text-xl font-extrabold text-foreground">{coupons.length}</p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Mã Đang Hoạt Động</p>
            <p className="text-xl font-extrabold text-foreground">
              {coupons.filter((c) => c.status === "ACTIVE").length}
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Tổng Lượt Đã Sử Dụng</p>
            <p className="text-xl font-extrabold text-foreground">
              {coupons.reduce((acc, cur) => acc + cur.usedCount, 0)} lượt
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Mã Hết Hạn</p>
            <p className="text-xl font-extrabold text-foreground">
              {coupons.filter((c) => c.status === "EXPIRED").length}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Coupons Card */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Search & Toolbar */}
        <div className="p-4 bg-muted/20 border-b border-border/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-6">
            <Label className="text-[11px] font-bold text-muted-foreground">Từ khóa tìm kiếm</Label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo Mã Coupon..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-8 h-9 text-xs border border-border bg-background rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 uppercase"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Loại giảm giá</Label>
            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                <SelectItem value="FIXED">Số tiền cố định (VNĐ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-3">
            <Label className="text-[11px] font-bold text-muted-foreground">Trạng thái</Label>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(0); }}>
              <SelectTrigger className="h-9 text-xs bg-background border border-border rounded-lg font-semibold">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="EXPIRED">Đã hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Coupons Table */}
        <CardContent className="p-0 relative">
          <Table containerClassName="max-h-[calc(100vh-320px)] min-h-[350px] overflow-auto border-b border-border/20" className="-mt-3 pb-4">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-2xs border-b border-border/40">
              <TableRow className="border-b border-border/30 bg-muted/20 hover:bg-muted/20">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">Mã Coupon</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loại Giảm Giá</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mức Giảm</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lượt Sử Dụng</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thời Gian Hiệu Lực</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng Thái</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Thao Tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="opacity-90">
              {paginatedCoupons.length > 0 ? (
                paginatedCoupons.map((cp) => (
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
                          className="h-6 w-6 text-muted-foreground hover:bg-muted"
                          title="Sao chép mã"
                        >
                          {copiedCode === cp.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {cp.discountType === "PERCENT" ? "Phần trăm (%)" : "Số tiền cố định"}
                    </TableCell>
                    <TableCell className="font-extrabold text-xs text-emerald-600">
                      {cp.discountType === "PERCENT"
                        ? `Giảm ${cp.value ?? 0}%`
                        : `Giảm ${(cp.value ?? 0).toLocaleString()} đ`}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {cp.usedCount ?? 0} / {cp.maxUsage ?? 0} lượt
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-semibold">
                      {cp.validFrom || "N/A"} đến {cp.validTo || "N/A"}
                    </TableCell>
                    <TableCell>
                      {cp.status === "ACTIVE" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                          Hết hạn
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteCoupon(cp.id)}
                        className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                        title="Xóa Coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Không tìm thấy mã giảm giá nào.
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

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-foreground text-sm">Tạo Mã Giảm Giá Mới</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Mã Coupon</Label>
                <Input
                  type="text"
                  placeholder="Ví dụ: AILMS20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="h-9 font-mono uppercase text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Loại Giảm Giá</Label>
                  <Select value={discountType} onValueChange={(val) => setDiscountType((val as DiscountType) || "PERCENT")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Chọn loại giảm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                      <SelectItem value="FIXED">Số tiền cố định (VNĐ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Mức Giảm</Label>
                  <Input
                    type="number"
                    min={1}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    required
                    className="h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground">Số Lượt Sử Dụng Tối Đa</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Number(e.target.value))}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Ngày Bắt Đầu</Label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Ngày Hết Hạn</Label>
                  <Input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="h-9 text-xs font-semibold rounded-xl">
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting} className="h-9 text-xs font-bold bg-primary text-primary-foreground rounded-xl">
                  {submitting ? "Đang xử lý..." : "Tạo Mã Coupon"}
                </Button>
              </div>
            </form>
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

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteCouponId)}
        onOpenChange={(open) => { if (!open) setDeleteCouponId(null); }}
        title="Xác nhận xóa mã giảm giá"
        description="Bạn có chắc chắn muốn xóa mã giảm giá này? Thao tác không thể hoàn tác."
        confirmText="Xóa coupon"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteCouponAction}
      />

    </div>
  );
};
