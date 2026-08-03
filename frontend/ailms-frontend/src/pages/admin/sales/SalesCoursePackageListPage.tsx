import React, { useState, useEffect } from "react";
import { salesApi, type CoursePackageItem, type DeliveryModeEnum } from "@/api/sales/salesApi";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useToast } from "@/hooks/useToast";

export const SalesCoursePackageListPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [packages, setPackages] = useState<CoursePackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryModeFilter, setDeliveryModeFilter] = useState("ALL");

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getCoursePackages();
      setPackages(data);
    } catch (err) {
      error("Không thể tải danh sách gói học");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleToggleStatus = async (pkg: CoursePackageItem) => {
    const nextStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, status: nextStatus } : p))
    );
    await salesApi.toggleCoursePackageStatus(pkg.id, nextStatus);
    success(`Đã cập nhật trạng thái gói ${pkg.name} thành ${nextStatus}`);
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const getDeliveryModeLabel = (mode: DeliveryModeEnum) => {
    switch (mode) {
      case "ONE_ON_ONE":
        return "Gói Kèm 1-1";
      case "LIVE_CLASS":
        return "Lớp Online Live";
      case "HYBRID":
        return "Lớp Hybrid 2026";
      case "SELF_PACED":
        return "Tự học (Self-Paced)";
      default:
        return mode;
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (deliveryModeFilter !== "ALL" && pkg.deliveryMode !== deliveryModeFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = pkg.name.toLowerCase().includes(term);
      const matchCourse = pkg.courseName.toLowerCase().includes(term);
      if (!matchName && !matchCourse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý Gói học (Course Packages)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý cấu hình giá bán, hình thức đào tạo và trạng thái phân phối sản phẩm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPackages}
            disabled={loading}
            className="rounded-lg gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/sales/course-packages/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-2 cursor-pointer text-xs font-semibold shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              Tạo Gói học mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border/50 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên Gói học hoặc Khóa học gốc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9 bg-card"
          />
        </div>

        <select
          value={deliveryModeFilter}
          onChange={(e) => setDeliveryModeFilter(e.target.value)}
          className="h-9 w-full sm:w-auto text-xs bg-card border border-border/60 rounded-lg px-3 text-foreground font-medium"
        >
          <option value="ALL">Tất cả hình thức học</option>
          <option value="SELF_PACED">SELF_PACED (Tự học)</option>
          <option value="LIVE_CLASS">LIVE_CLASS (Trực tuyến)</option>
          <option value="HYBRID">HYBRID (Kết hợp)</option>
          <option value="ONE_ON_ONE">ONE_ON_ONE (Kèm 1-1)</option>
        </select>
      </div>

      {/* Grid Card Layout (Section 3.6 Specification) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPackages.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-xl border border-border/40">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Chưa có gói học nào phù hợp</p>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className="border border-border/40 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden bg-card flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                {/* Header: Mode Badge + Status Badge + Quick Toggle Switch */}
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                    {getDeliveryModeLabel(pkg.deliveryMode)}
                  </span>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={pkg.status} size="sm" />
                    {/* Quick Switch Toggle */}
                    <button
                      onClick={() => handleToggleStatus(pkg)}
                      title="Quick Toggle Status"
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        pkg.status === "ACTIVE" ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          pkg.status === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Package Name & Course Info */}
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground leading-snug">{pkg.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{pkg.courseName}</span>
                  </div>
                </div>

                {/* Features List */}
                {pkg.features && pkg.features.length > 0 && (
                  <div className="space-y-1.5 pt-2 text-xs text-slate-600 dark:text-slate-400">
                    {pkg.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price Display */}
                <div className="pt-3 border-t border-border/40 flex items-baseline gap-2">
                  <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">
                    {formatVND(pkg.sellingPrice)}
                  </span>
                  {pkg.originalPrice > pkg.sellingPrice && (
                    <span className="text-xs text-muted-foreground line-through font-semibold">
                      {formatVND(pkg.originalPrice)}
                    </span>
                  )}
                </div>
              </CardContent>

              {/* Bottom Action Footer */}
              <div className="p-3 bg-muted/30 border-t border-border/40 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/sales/course-packages/${pkg.id}`)}
                  className="rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Chỉnh sửa gói
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
