import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BookOpen, Users, User, Layers, Plus, Loader2, Save } from "lucide-react";
import type { DeliveryMode, CoursePackage } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

interface CreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  courseStatus: string;
  onPackageCreated: (newPkg: CoursePackage) => void;
  editingPackage?: CoursePackage | null;
  initialSelectedClassId?: string;
}

export const CreatePackageDialog: React.FC<CreatePackageDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  courseName,
  courseStatus,
  onPackageCreated,
  editingPackage,
  initialSelectedClassId,
}) => {
  const navigate = useNavigate();
  const isEdit = Boolean(editingPackage);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("GROUP_CLASS");
  const [packageName, setPackageName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("60");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialSelectedClassId || "");
  const [classes, setClasses] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (open && editingPackage) {
      setDeliveryMode((editingPackage.deliveryMode as DeliveryMode) || "GROUP_CLASS");
      setPackageName(editingPackage.name || "");
      setPrice(editingPackage.price != null ? String(editingPackage.price) : "");
      setDurationDays(editingPackage.durationDays != null ? String(editingPackage.durationDays) : "60");
      setSelectedClassId(editingPackage.attachedClassId || "");
    } else if (open && !editingPackage) {
      // Reset for create mode
      setDeliveryMode("GROUP_CLASS");
      setPackageName("");
      setPrice("");
      setDurationDays("60");
      setSelectedClassId(initialSelectedClassId || "");
    }
  }, [open, editingPackage, initialSelectedClassId]);

  const [existingPackages, setExistingPackages] = useState<CoursePackage[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      adminCourseClassApi.getClassesByCourse(courseId),
      adminCourseClassApi.getPackagesByCourse(courseId),
    ])
      .then(([clsList, pkgList]) => {
        setClasses(clsList);
        setExistingPackages(pkgList || []);
        if (initialSelectedClassId) {
          setSelectedClassId(initialSelectedClassId);
        }
      })
      .catch((err) => setError(err?.response?.data?.message || "Không thể tải dữ liệu lớp học của khóa học"));
  }, [open, courseId, initialSelectedClassId]);

  // Get ready classes for this course
  const readyClasses = classes.filter((c) => c.status === "ACTIVE" && c.packageType === "GROUP_CLASS");

  // Check if a class is already attached to an existing package (other than the editing one)
  const getAttachedPackage = (classId: string) => {
    return existingPackages.find(
      (p) => p.id !== editingPackage?.id && (String(p.attachedClassId || (p as any).classId) === String(classId))
    );
  };

  const availableClasses = readyClasses.filter((c) => !getAttachedPackage(String(c.id)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEdit && courseStatus !== "ACTIVE") {
      setError("Không thể tạo gói bán: khóa học phải ở trạng thái Đang hoạt động (ACTIVE).");
      return;
    }
    const normalizedName = packageName.trim();
    if (normalizedName.length < 3 || normalizedName.length > 150) {
      setError("Tên gói bán phải có từ 3 đến 150 ký tự.");
      return;
    }
    const numPrice = Number(price);
    const numDuration = Number(durationDays);

    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      setError("Giá bán phải lớn hơn 0.");
      return;
    }
    if (!Number.isInteger(numDuration) || numDuration <= 0 || numDuration > 3650) {
      setError("Thời hạn truy cập phải là số nguyên từ 1 đến 3.650 ngày.");
      return;
    }

    if (!isEdit && deliveryMode === "GROUP_CLASS" && availableClasses.length === 0) {
      setError("Tất cả các lớp học nhóm hiện tại đều đã được gán gói bán. Vui lòng tạo lớp học mới.");
      return;
    }

    const selectedClass = readyClasses.find((c) => String(c.id) === selectedClassId);

    if (deliveryMode === "GROUP_CLASS" && !selectedClassId && !isEdit) {
      setError("Vui lòng chọn lớp học nhóm.");
      return;
    }

    if (deliveryMode === "GROUP_CLASS" && selectedClassId) {
      const attached = getAttachedPackage(selectedClassId);
      if (attached) {
        setError(`Lớp học này đã được gán cho gói bán "${attached.name}". Vui lòng chọn lớp học khác hoặc tạo lớp mới.`);
        return;
      }
    }
    setSubmitting(true); setError("");
    try {
      let saved: any;
      if (isEdit && editingPackage) {
        saved = await adminCourseClassApi.updatePackage(editingPackage.id, {
          courseId,
          classId: deliveryMode === "GROUP_CLASS" ? selectedClassId || null : null,
          name: normalizedName,
          deliveryMode,
          price: numPrice,
          originalPrice: (editingPackage as any).originalPrice ?? numPrice,
          durationDays: numDuration,
          status: editingPackage.active ? "ACTIVE" : "INACTIVE",
        });
      } else {
        saved = await adminCourseClassApi.createPackage({
          courseId,
          classId: deliveryMode === "GROUP_CLASS" ? selectedClassId : null,
          name: normalizedName,
          deliveryMode,
          price: numPrice,
          originalPrice: numPrice,
          durationDays: numDuration,
          status: "ACTIVE",
        });
      }
      onPackageCreated({ ...saved, id: String(saved.id), courseId: String(saved.courseId), active: saved.status === "ACTIVE",
        attachedClassId: saved.classId ? String(saved.classId) : undefined, attachedClassName: saved.className,
        attachedClassCapacity: selectedClass ? { current: selectedClass.currentMemberCount || 0, max: selectedClass.maxMembers || 0 } : undefined,
      } as CoursePackage);
      onOpenChange(false);
    } catch (err: any) { setError(err?.response?.data?.message || (isEdit ? "Không thể cập nhật gói bán" : "Không thể tạo gói bán")); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 sm:p-8">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEdit ? "Chỉnh sửa Gói Bán" : "Tạo Gói Bán Khóa Học Mới"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Khóa học: <span className="font-semibold text-slate-700">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
          {/* Step 1: Delivery Mode Selector via Large Cards */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-800">
              1. Chọn Hình Thức Đào Tạo (Delivery Mode) *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* SELF_STUDY */}
              <div
                className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all flex flex-col justify-between ${
                  deliveryMode === "SELF_STUDY"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => setDeliveryMode("SELF_STUDY")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">Tự Học Online</span>
                </div>
                <p className="text-xs text-slate-500">
                  Học qua bài giảng video & tài liệu tự do.
                </p>
              </div>

              {/* GROUP_CLASS */}
              <div
                className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all flex flex-col justify-between ${
                  deliveryMode === "GROUP_CLASS"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => setDeliveryMode("GROUP_CLASS")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">Lớp Học Nhóm</span>
                </div>
                <p className="text-xs text-slate-500">
                  Học tương tác với giáo viên & sĩ số cố định.
                </p>
              </div>

              {/* ONE_ON_ONE */}
              <div
                className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all flex flex-col justify-between ${
                  deliveryMode === "ONE_ON_ONE"
                    ? "border-purple-600 bg-purple-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => setDeliveryMode("ONE_ON_ONE")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">1 Kèm 1 VIP</span>
                </div>
                <p className="text-xs text-slate-500">
                  Kèm riêng 1-on-1 theo thời khóa biểu cá nhân.
                </p>
              </div>

              {/* COMBO */}
              <div
                className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all flex flex-col justify-between ${
                  deliveryMode === "COMBO"
                    ? "border-amber-500 bg-amber-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
                onClick={() => setDeliveryMode("COMBO")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-900">Combo Hỗn hợp</span>
                </div>
                <p className="text-xs text-slate-500">
                  Kết hợp giữa Tự học video và Lớp nhóm/Kèm.
                </p>
              </div>
            </div>
          </div>

          {/* Form details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Tên Gói Bán *</Label>
              <Input
                placeholder="VD: Java Lớp Nhóm K12 - Khóa Mùa Thu"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Giá Bán (VNĐ) *</Label>
              <Input
                type="number"
                placeholder="VD: 3500000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Thời Hạn Truy Cập (Ngày) *</Label>
              <Input
                type="number"
                placeholder="VD: 60"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
                className="h-10"
              />
            </div>
          </div>

          {/* Special Logic for GROUP_CLASS */}
          {deliveryMode === "GROUP_CLASS" && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-800">
                  2. Chọn Lớp Học Nhóm (Yêu cầu Trạng thái READY) *
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-xs font-bold text-blue-600 underline cursor-pointer"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/admin/classes/create", {
                      state: {
                        courseId,
                        courseName,
                        returnUrl: `/admin/courses/${courseId}`,
                        packageMode: deliveryMode,
                        packageId: editingPackage?.id,
                      },
                    });
                  }}
                >
                  [+ Tạo Lớp Học Mới Ngay]
                </Button>
              </div>

              {readyClasses.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">
                      Chưa có lớp học nào ở trạng thái READY cho khóa học này.
                    </p>
                    <p>
                      Bạn phải tạo 1 lớp học mới ở trạng thái Sẵn Sàng trước khi tạo gói bán nhóm.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {readyClasses.map((cls) => {
                    const attachedPkg = getAttachedPackage(String(cls.id));
                    const isAttached = Boolean(attachedPkg);
                    const isSelected = selectedClassId === String(cls.id);
                    const classCode = cls.code || `LH-${cls.id}`;
                    const teacherDisplayName = cls.teacherName || cls.teacher?.name || "Chưa phân công";

                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          if (isAttached) return;
                          setSelectedClassId(String(cls.id));
                        }}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          isAttached
                            ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-blue-600 bg-blue-50/80 font-medium cursor-pointer shadow-sm ring-1 ring-blue-500/30"
                            : "border-slate-200 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{cls.name}</span>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-mono">
                              Mã lớp: {classCode}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                              👨‍🏫 Giảng viên: {teacherDisplayName}
                            </span>
                            {cls.startDate && (
                              <span className="text-slate-500">
                                📅 {new Date(cls.startDate).toLocaleDateString("vi-VN")} - {new Date(cls.endDate || cls.startDate).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>

                          {isAttached && (
                            <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                              🔒 Đã gán gói bán: <span className="font-semibold">{attachedPkg?.name}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          <Badge variant="outline" className="bg-white text-xs font-semibold px-2.5 py-1">
                            Sĩ số: {cls.currentMemberCount || 0}/{cls.maxMembers || 0}
                          </Badge>
                          {isAttached && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-2 py-0.5">
                              Đã có gói
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                !packageName ||
                (!isEdit && courseStatus !== "ACTIVE") ||
                submitting ||
                (!isEdit && deliveryMode === "GROUP_CLASS" && (!selectedClassId || readyClasses.length === 0))
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : isEdit ? (
                <Save className="w-4 h-4 mr-1.5" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              {isEdit ? "Lưu thay đổi" : "Tạo Gói Bán"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
