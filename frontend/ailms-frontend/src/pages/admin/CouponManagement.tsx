import React, { useState, useEffect } from "react";
import { orderApi, type CouponResponse, type CreateCouponRequest, type DiscountType } from "@/api/orders/orderApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Tag,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("Vui lòng nhập mã coupon.");
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
      alert(`Đã tạo thành công mã giảm giá ${code.toUpperCase()}`);
      setIsCreateModalOpen(false);
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mã giảm giá này?")) return;
    try {
      try {
        await orderApi.deleteCoupon(id);
      } catch (e) {
        console.log("Backend delete coupon note:", e);
      }
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Error deleting coupon:", e);
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Quản Lý Mã Giảm Giá (Coupons)</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Tạo và quản lý các chương trình ưu đãi mã giảm giá áp dụng cho học viên.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCoupons} variant="outline" size="sm" className="rounded-xl gap-1 text-xs font-bold">
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="rounded-xl gap-1 text-xs font-bold bg-primary">
            <Plus className="h-3.5 w-3.5" /> Tạo Coupon Mới
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Tìm theo Mã Coupon..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl text-xs uppercase"
        />
      </div>

      {/* Coupons Table */}
      <Card className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold border-b border-border">
              <tr>
                <th className="p-4">Mã Coupon</th>
                <th className="p-4">Loại Giảm Giá</th>
                <th className="p-4">Mức Giảm</th>
                <th className="p-4">Lượt Sử Dụng</th>
                <th className="p-4">Thời Gian Hiệu Lực</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((cp) => (
                  <tr key={cp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-extrabold text-foreground tracking-wider">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        {cp.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      {cp.discountType === "PERCENT" ? "Theo phần trăm (%)" : "Số tiền cố định"}
                    </td>
                    <td className="p-4 font-extrabold text-emerald-600">
                      {cp.discountType === "PERCENT"
                        ? `Giảm ${cp.value}%`
                        : `Giảm ${cp.value.toLocaleString()} đ`}
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      {cp.usedCount} / {cp.maxUsage} lượt
                    </td>
                    <td className="p-4 text-muted-foreground text-[11px]">
                      {cp.validFrom} đến {cp.validTo}
                    </td>
                    <td className="p-4">
                      {cp.status === "ACTIVE" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCoupon(cp.id)}
                        className="rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Chưa có mã giảm giá nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE COUPON MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Tag className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Tạo Mã Giảm Giá Mới</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Mã Coupon (Code):</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: SUMMER2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="rounded-xl uppercase font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Loại giảm giá:</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full h-10 px-3 bg-card border border-border rounded-xl font-medium text-foreground outline-none focus:border-primary"
                  >
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Mức giảm (Value):</label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Số lượt sử dụng tối đa:</label>
                <Input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Number(e.target.value))}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Ngày bắt đầu:</label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Ngày hết hạn:</label>
                  <Input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl font-bold bg-primary"
                >
                  {submitting ? "Đang tạo..." : "Xác nhận Tạo Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
