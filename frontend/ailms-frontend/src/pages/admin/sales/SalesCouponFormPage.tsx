import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salesApi } from "@/api/sales/salesApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Tag } from "lucide-react";

import { useToast } from "@/hooks/useToast";

export const SalesCouponFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const isEdit = Boolean(id);

  const [code, setCode] = useState(isEdit ? "AILMS20" : "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState<number>(20);
  const [maxUsage, setMaxUsage] = useState<number>(100);
  const [scope, setScope] = useState<"SYSTEM" | "COURSE">("SYSTEM");
  const [applicableCourseName, setApplicableCourseName] = useState("");
  const [validFrom, setValidFrom] = useState("2026-08-01");
  const [validTo, setValidTo] = useState("2026-08-31");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      error("Vui lòng nhập Mã Coupon!");
      return;
    }
    if (discountType === "PERCENT" && (value <= 0 || value > 100)) {
      error("Tỉ lệ giảm giá theo phần trăm phải nằm trong khoảng 1% đến 100%");
      return;
    }
    if (discountType === "FIXED" && value <= 0) {
      error("Giá trị giảm cố định phải lớn hơn 0 VNĐ");
      return;
    }

    setSaving(true);
    try {
      await salesApi.saveCoupon({
        code,
        discountType,
        value: Number(value),
        maxUsage: Number(maxUsage),
        validFrom,
        validTo,
        applicableCourseName: scope === "COURSE" ? applicableCourseName : undefined,
      });
      success(isEdit ? "Đã cập nhật mã giảm giá thành công!" : "Đã tạo mã giảm giá mới thành công!");
      navigate("/sales/coupons");
    } catch (err) {
      error("Lỗi khi lưu thông tin Coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sales/coupons")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {isEdit ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá mới"}
        </h1>
      </div>

      <Card className="border border-border/40 shadow-xs rounded-xl p-6 bg-card">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="font-bold text-foreground block mb-1">Mã Coupon (Mã Code)</label>
            <Input
              placeholder="VD: SUMMER2026"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono uppercase font-bold text-sm bg-card"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-foreground block mb-1">Loại giảm giá</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full h-9 bg-card border border-border/60 rounded-md px-3 text-xs font-semibold"
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VNĐ)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">
                Giá trị giảm ({discountType === "PERCENT" ? "%" : "VNĐ"})
              </label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="bg-card font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-foreground block mb-1">Tối đa lượt sử dụng (Max Usage)</label>
              <Input
                type="number"
                value={maxUsage}
                onChange={(e) => setMaxUsage(Number(e.target.value))}
                className="bg-card font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Phạm vi áp dụng (Scope)</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full h-9 bg-card border border-border/60 rounded-md px-3 text-xs font-semibold"
              >
                <option value="SYSTEM">Toàn hệ thống (Tất cả khóa học)</option>
                <option value="COURSE">Khóa học cụ thể</option>
              </select>
            </div>
          </div>

          {scope === "COURSE" && (
            <div>
              <label className="font-bold text-foreground block mb-1">Tên khóa học áp dụng</label>
              <Input
                placeholder="VD: Fullstack Web Pro 1-1"
                value={applicableCourseName}
                onChange={(e) => setApplicableCourseName(e.target.value)}
                className="bg-card"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div>
              <label className="font-bold text-foreground block mb-1">Ngày bắt đầu hiệu lực</label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="bg-card" />
            </div>

            <div>
              <label className="font-bold text-foreground block mb-1">Ngày hết hạn</label>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="bg-card" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/sales/coupons")}
              className="rounded-lg text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold gap-2 cursor-pointer shadow-sm"
            >
              <Save className="h-4 w-4" />
              Lưu thông tin Coupon
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
