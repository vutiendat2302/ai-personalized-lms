import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import type { DeliveryModeEnum } from "@/api/sales/salesApi";

export const SalesCoursePackageFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState(isEdit ? "Gói Kèm 1-1 Chuyên Sâu Pro" : "");
  const [courseName, setCourseName] = useState(isEdit ? "Fullstack Web Pro 1-1" : "");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeEnum>("ONE_ON_ONE");
  const [originalPrice, setOriginalPrice] = useState<number>(4500000);
  const [sellingPrice, setSellingPrice] = useState<number>(3280000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Vui lòng nhập tên gói học");
    alert("Đã lưu thông tin Gói học!");
    navigate("/sales/course-packages");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/sales/course-packages")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          {isEdit ? "Cấu hình Gói học" : "Tạo Gói học sản phẩm mới"}
        </h1>
      </div>

      <Card className="border border-border/40 shadow-xs rounded-xl p-6 bg-card">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-foreground block mb-1">Tên Gói học sản phẩm</label>
            <Input
              placeholder="VD: Gói Kèm 1-1 Chuyên Sâu Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Khóa học gốc áp dụng</label>
            <Input
              placeholder="VD: Fullstack Web Pro 1-1"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="bg-card"
            />
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">Hình thức đào tạo (Delivery Mode)</label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value as any)}
              className="w-full h-9 bg-card border border-border/60 rounded-md px-3 text-xs font-semibold"
            >
              <option value="SELF_PACED">SELF_PACED (Tự học trọn đời)</option>
              <option value="LIVE_CLASS">LIVE_CLASS (Lớp trực tuyến)</option>
              <option value="HYBRID">HYBRID (Kết hợp tự học + Live)</option>
              <option value="ONE_ON_ONE">ONE_ON_ONE (Kèm 1-1 Chuyên sâu)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div>
              <label className="font-bold text-foreground block mb-1">Giá gốc niêm yết (VNĐ)</label>
              <Input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
                className="bg-card font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-foreground block mb-1">Giá bán khuyến mãi (VNĐ)</label>
              <Input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="bg-card font-bold text-indigo-600"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/sales/course-packages")}
              className="rounded-lg text-xs font-semibold cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold gap-2 cursor-pointer shadow-sm"
            >
              <Save className="h-4 w-4" />
              Lưu gói sản phẩm
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
