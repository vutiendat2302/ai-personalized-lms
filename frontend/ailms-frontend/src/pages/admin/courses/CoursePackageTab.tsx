import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, ExternalLink, BookOpen, Users, User, Layers } from "lucide-react";
import type { CoursePackage, DeliveryMode } from "@/types/adminCourseClass";
import { CreatePackageDialog } from "./CreatePackageDialog";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface CoursePackageTabProps {
  courseId: string;
  courseName: string;
  packages: CoursePackage[];
}

export const CoursePackageTab: React.FC<CoursePackageTabProps> = ({
  courseId,
  courseName,
  packages: initialPackages,
}) => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<CoursePackage[]>(initialPackages);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const handleToggleActive = async (id: string) => {
    const pkg: any = packages.find((item) => item.id === id);
    if (!pkg) return;
    setError("");
    try {
      const saved = await adminCourseClassApi.updatePackage(id, {
        courseId, classId: pkg.attachedClassId || pkg.classId || null, name: pkg.name,
        deliveryMode: pkg.deliveryMode, price: pkg.price, originalPrice: pkg.originalPrice ?? pkg.price,
        durationDays: pkg.durationDays, description: pkg.description,
        includedTutorSessions: pkg.includedTutorSessions, maxGroupSize: pkg.maxGroupSize,
        status: pkg.active ? "INACTIVE" : "ACTIVE",
      });
      setPackages((prev) => prev.map((item) => item.id === id ? { ...item, active: saved.status === "ACTIVE" } : item));
    } catch (err: any) { setError(err?.response?.data?.message || "Không thể cập nhật trạng thái gói bán"); }
  };

  const handlePackageCreated = (newPkg: CoursePackage) => {
    setPackages((prev) => [newPkg, ...prev]);
  };

  const getDeliveryModeBadge = (mode: DeliveryMode) => {
    switch (mode) {
      case "SELF_STUDY":
        return (
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-semibold px-2.5 py-1">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-500" /> Tự Học Online
          </Badge>
        );
      case "GROUP_CLASS":
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold px-2.5 py-1">
            <Users className="w-3.5 h-3.5 mr-1 text-blue-600" /> Lớp Học Nhóm
          </Badge>
        );
      case "ONE_ON_ONE":
        return (
          <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-semibold px-2.5 py-1">
            <User className="w-3.5 h-3.5 mr-1 text-purple-600" /> 1 Kèm 1 VIP
          </Badge>
        );
      case "COMBO":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 mr-1" /> Gói Combo
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Danh Sách Gói Bán Khóa Học</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình giá bán và hình thức triển khai cho học viên
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tạo Gói Bán Mới
        </Button>
      </div>

      {/* Horizontal Package Cards List */}
      <div className="space-y-3">
        {packages.length === 0 ? (
          <Card className="border-dashed border-2 p-8 text-center bg-slate-50">
            <p className="text-sm text-slate-500">Chưa có gói bán nào cho khóa học này.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setIsDialogOpen(true)}
            >
              + Thêm Gói Đầu Tiên
            </Button>
          </Card>
        ) : (
          packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`border transition-all ${
                pkg.active
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-slate-200 bg-slate-50/70 opacity-75"
              }`}
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Badge */}
                <div className="flex items-center gap-3 md:w-1/5">
                  {getDeliveryModeBadge(pkg.deliveryMode)}
                </div>

                {/* Middle: Title, Price, Duration */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{pkg.name}</h3>
                    {!pkg.active && (
                      <Badge variant="outline" className="text-xs text-slate-400">
                        Đang ẩn
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-extrabold text-blue-600 text-lg">
                      {pkg.price.toLocaleString("vi-VN")} đ
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium text-xs bg-slate-100 px-2 py-0.5 rounded">
                      Thời hạn: {pkg.durationDays} ngày
                    </span>
                  </div>
                </div>

                {/* Right: Class link for GROUP_CLASS */}
                {pkg.deliveryMode === "GROUP_CLASS" && (
                  <div className="md:w-1/3 bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">Lớp gán kèm:</span>
                      <span className="font-bold text-slate-800">
                        {pkg.attachedClassName || "Chưa gắn lớp"}
                      </span>
                      {pkg.attachedClassCapacity && (
                        <span className="text-slate-500 font-medium ml-1.5">
                          ({pkg.attachedClassCapacity.current}/{pkg.attachedClassCapacity.max})
                        </span>
                      )}
                    </div>
                    {pkg.attachedClassId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 p-1"
                        onClick={() => navigate(`/admin/classes/${pkg.attachedClassId}`)}
                      >
                        Chi tiết lớp <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}

                {/* End Actions: Edit & Checkbox Toggle */}
                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-end">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`active-${pkg.id}`}
                      checked={pkg.active}
                      onCheckedChange={() => handleToggleActive(pkg.id)}
                    />
                    <label htmlFor={`active-${pkg.id}`} className="text-xs text-slate-600 font-medium cursor-pointer">
                      {pkg.active ? "Đang hiện" : "Đang ẩn"}
                    </label>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 px-2.5">
                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <CreatePackageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        courseId={courseId}
        courseName={courseName}
        onPackageCreated={handlePackageCreated}
      />
    </div>
  );
};
