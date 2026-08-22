import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { AlertCircle, BookOpen, Plus, Loader2, Save, ExternalLink, Info, DollarSign, Clock, Check } from "lucide-react";
import type { DeliveryMode, CoursePackage } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import { cn } from "@/lib/utils";

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

const formatVND = (val?: number | string) => {
  if (val == null) return "0 ₫";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

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
  const location = useLocation();
  const isEdit = Boolean(editingPackage);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("SELF_STUDY");
  const [packageName, setPackageName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [durationDays, setDurationDays] = useState("365");
  const [includedTutorSessions, setIncludedTutorSessions] = useState("");
  const [maxGroupSize, setMaxGroupSize] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialSelectedClassId || "");
  const [classes, setClasses] = useState<any[]>([]);
  const [existingPackages, setExistingPackages] = useState<CoursePackage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // 🌟 SHADCN UI INLINE FIELD ERRORS STATE 🌟
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pre-fill form when opening
  useEffect(() => {
    if (open && editingPackage) {
      setDeliveryMode((editingPackage.deliveryMode as DeliveryMode) || "SELF_STUDY");
      setPackageName(editingPackage.name || "");
      setPrice(editingPackage.price != null ? String(editingPackage.price) : "");
      setOriginalPrice(
        (editingPackage as any).originalPrice != null
          ? String((editingPackage as any).originalPrice)
          : editingPackage.price != null
          ? String(editingPackage.price)
          : ""
      );
      setDurationDays(editingPackage.durationDays != null ? String(editingPackage.durationDays) : "365");
      setIncludedTutorSessions((editingPackage as any).includedTutorSessions != null ? String((editingPackage as any).includedTutorSessions) : "");
      setMaxGroupSize((editingPackage as any).maxGroupSize != null ? String((editingPackage as any).maxGroupSize) : "");
      setSelectedClassId(editingPackage.attachedClassId || (editingPackage as any).classId || "");
      setFieldErrors({});
    } else if (open && !editingPackage) {
      // Reset for create mode
      setDeliveryMode("SELF_STUDY");
      setPackageName("");
      setPrice("");
      setOriginalPrice("");
      setDurationDays("365");
      setIncludedTutorSessions("");
      setMaxGroupSize("");
      setSelectedClassId(initialSelectedClassId || "");
      setFieldErrors({});
    }
  }, [open, editingPackage, initialSelectedClassId]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      adminCourseClassApi.getClassesByCourse(courseId),
      adminCourseClassApi.getPackagesByCourse(courseId),
    ])
      .then(([clsList, pkgList]) => {
        setClasses(Array.isArray(clsList) ? clsList : []);
        setExistingPackages(pkgList || []);
        if (initialSelectedClassId) {
          setSelectedClassId(initialSelectedClassId);
        }
      })
      .catch(() => {});
  }, [open, courseId, initialSelectedClassId]);

  // Check if a class is already attached to an existing package
  const getAttachedPackage = (clsId: string) => {
    return existingPackages.find(
      (p) => p.id !== editingPackage?.id && String(p.attachedClassId || (p as any).classId) === String(clsId)
    );
  };

  const readyClasses = classes.filter((c) => c.status === "ACTIVE" || c.status === "READY");

  const isGroupRequired = deliveryMode === "GROUP_CLASS";

  // 🌟 SHADCN FORM VALIDATION FUNCTION 🌟
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!isEdit && courseStatus !== "ACTIVE") {
      errs.general = "Không thể tạo gói bán: Khóa học phải ở trạng thái Đang hoạt động (ACTIVE).";
    }

    const normalizedName = packageName.trim();
    if (!normalizedName) {
      errs.packageName = "Vui lòng nhập Tên gói bán sản phẩm!";
    } else if (normalizedName.length > 100) {
      errs.packageName = "Tên gói bán không được vượt quá 100 ký tự!";
    }

    // 1. Price validation
    if (!price.trim()) {
      errs.price = "Vui lòng nhập Giá bán thực tế!";
    } else {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        errs.price = "Giá bán thực tế phải lớn hơn hoặc bằng 0!";
      }
    }

    // 2. Original Price validation
    if (!originalPrice.trim()) {
      errs.originalPrice = "Vui lòng nhập Giá niêm yết gốc!";
    } else {
      const numOrig = Number(originalPrice);
      if (isNaN(numOrig) || numOrig < 0) {
        errs.originalPrice = "Giá niêm yết gốc phải lớn hơn hoặc bằng 0!";
      }
    }

    // 3. Price vs Original Price validation
    if (price.trim() && originalPrice.trim()) {
      const p = Number(price);
      const op = Number(originalPrice);
      if (p > op) {
        errs.price = `Giá bán thực tế (${formatVND(p)}) không được lớn hơn Giá niêm yết gốc (${formatVND(op)})!`;
      }
    }

    // 4. Duration validation
    if (durationDays.trim()) {
      const numDur = Number(durationDays);
      if (isNaN(numDur) || numDur <= 0) {
        errs.durationDays = "Thời hạn truy cập phải lớn hơn 0 ngày!";
      }
    }

    // 5. Tutor sessions validation
    if (deliveryMode === "GROUP_CLASS" || deliveryMode === "ONE_ON_ONE") {
      if (includedTutorSessions.trim()) {
        const numTutor = Number(includedTutorSessions);
        if (isNaN(numTutor) || numTutor < 0) {
          errs.includedTutorSessions = "Số buổi kèm riêng phải lớn hơn hoặc bằng 0!";
        }
      }
    }

    // 6. Max Group Size & Class Attachment validation
    if (deliveryMode === "GROUP_CLASS") {
      if (!maxGroupSize || Number(maxGroupSize) <= 0) {
        errs.maxGroupSize = "Gói Lớp Nhóm phải nhập Sĩ số tối đa học viên lớn hơn 0!";
      }
      if (!selectedClassId && !isEdit) {
        errs.classId = "Gói Lớp Nhóm bắt buộc phải chọn hoặc tạo mới Lớp học đính kèm!";
      }
    }

    if (selectedClassId) {
      const attached = getAttachedPackage(selectedClassId);
      if (attached) {
        errs.classId = `Lớp học này đã được gán cho gói bán "${attached.name}". Vui lòng chọn lớp khác.`;
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNavigateToCreateClass = () => {
    onOpenChange(false);
    navigate("/admin/classes/create", {
      state: {
        courseId,
        courseName,
        returnUrl: location.pathname,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const numPrice = Number(price);
    const numOriginalPrice = Number(originalPrice);
    const numDuration = durationDays ? Number(durationDays) : 365;

    setSubmitting(true);
    try {
      let saved: any;
      if (isEdit && editingPackage) {
        saved = await adminCourseClassApi.updatePackage(editingPackage.id, {
          courseId,
          classId: isGroupRequired ? selectedClassId || null : null,
          name: packageName.trim(),
          deliveryMode,
          price: numPrice,
          originalPrice: numOriginalPrice,
          durationDays: numDuration,
          includedTutorSessions:
            deliveryMode === "SELF_STUDY"
              ? undefined
              : includedTutorSessions !== ""
              ? Number(includedTutorSessions)
              : undefined,
          maxGroupSize:
            deliveryMode === "SELF_STUDY"
              ? undefined
              : deliveryMode === "ONE_ON_ONE"
              ? 1
              : maxGroupSize !== ""
              ? Number(maxGroupSize)
              : undefined,
          status: editingPackage.active ? "ACTIVE" : "INACTIVE",
        });
      } else {
        saved = await adminCourseClassApi.createPackage({
          courseId,
          classId: isGroupRequired ? selectedClassId || null : null,
          name: packageName.trim(),
          deliveryMode,
          price: numPrice,
          originalPrice: numOriginalPrice,
          durationDays: numDuration,
          includedTutorSessions:
            deliveryMode === "SELF_STUDY"
              ? undefined
              : includedTutorSessions !== ""
              ? Number(includedTutorSessions)
              : undefined,
          maxGroupSize:
            deliveryMode === "SELF_STUDY"
              ? undefined
              : deliveryMode === "ONE_ON_ONE"
              ? 1
              : maxGroupSize !== ""
              ? Number(maxGroupSize)
              : undefined,
          status: "ACTIVE",
        });
      }

      const selectedClass = readyClasses.find((c) => String(c.id) === selectedClassId);

      onPackageCreated({
        ...saved,
        id: String(saved.id),
        courseId: String(saved.courseId),
        active: saved.status === "ACTIVE",
        attachedClassId: saved.classId ? String(saved.classId) : undefined,
        attachedClassName: saved.className,
        attachedClassCapacity: selectedClass
          ? { current: selectedClass.currentMemberCount || 0, max: selectedClass.maxMembers || 0 }
          : undefined,
      } as CoursePackage);

      onOpenChange(false);
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        general: err?.response?.data?.message || (isEdit ? "Không thể cập nhật gói bán" : "Không thể tạo gói bán"),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const isPriceInvalid =
    price !== "" &&
    originalPrice !== "" &&
    Number(price) > Number(originalPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 text-left border-b border-border pb-3">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isEdit ? "Chỉnh sửa Gói Bán Khóa Học" : "Tạo Gói Bán Khóa Học Mới"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Khóa học áp dụng: <span className="font-bold text-foreground">{courseName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* 🌟 FORM WITH NOVALIDATE FOR SHADCN UI VALIDATION 🌟 */}
        <form noValidate onSubmit={handleSubmit} className="space-y-5 py-2">
          {fieldErrors.general && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span>{fieldErrors.general}</span>
            </div>
          )}

          {/* 1. Delivery Mode cards */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              1. Chọn Hình Thức Đào Tạo (DeliveryModeEnum) *
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* SELF_STUDY */}
              <div
                className={cn(
                  "cursor-pointer border-2 rounded-xl p-3 transition-all flex flex-col justify-between",
                  deliveryMode === "SELF_STUDY"
                    ? "border-primary bg-primary/10 shadow-xs font-medium"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                )}
                onClick={() => {
                  if (isEdit) return;
                  setDeliveryMode("SELF_STUDY");
                  setFieldErrors((prev) => ({ ...prev, classId: "", maxGroupSize: "", includedTutorSessions: "" }));
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">Gói Tự Học (Self-Study)</span>
                  {deliveryMode === "SELF_STUDY" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Học viên tự học qua bài giảng video & tài liệu tự do.
                </p>
              </div>

              {/* GROUP_CLASS */}
              <div
                className={cn(
                  "cursor-pointer border-2 rounded-xl p-3 transition-all flex flex-col justify-between",
                  deliveryMode === "GROUP_CLASS"
                    ? "border-primary bg-primary/10 shadow-xs font-medium"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                )}
                onClick={() => {
                  if (isEdit) return;
                  setDeliveryMode("GROUP_CLASS");
                  setFieldErrors((prev) => ({ ...prev, classId: "", maxGroupSize: "", includedTutorSessions: "" }));
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">Lớp Học Nhóm (Group Class)</span>
                  {deliveryMode === "GROUP_CLASS" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Học tương tác sĩ số cố định (Bắt buộc gắn Lớp).
                </p>
              </div>

              {/* ONE_ON_ONE */}
              <div
                className={cn(
                  "cursor-pointer border-2 rounded-xl p-3 transition-all flex flex-col justify-between",
                  deliveryMode === "ONE_ON_ONE"
                    ? "border-primary bg-primary/10 shadow-xs font-medium"
                    : "border-border hover:border-muted-foreground/40 bg-card"
                )}
                onClick={() => {
                  if (isEdit) return;
                  setDeliveryMode("ONE_ON_ONE");
                  setFieldErrors((prev) => ({ ...prev, classId: "", maxGroupSize: "", includedTutorSessions: "" }));
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground">Gia Sư 1 Kèm 1 (One-on-One)</span>
                  {deliveryMode === "ONE_ON_ONE" && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Kèm riêng 1-on-1 theo thời khóa biểu cá nhân.
                </p>
              </div>

            </div>
          </div>

          {/* 2. Package details */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Tên Gói Bán Sản Phẩm *</Label>
              <Input
                placeholder="VD: Java Fullstack Pro - Lớp Nhóm K12"
                value={packageName}
                onChange={(e) => {
                  setPackageName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, packageName: "" }));
                }}
                className={cn(
                  "h-9 text-xs rounded-xl font-semibold border-border bg-background text-foreground",
                  fieldErrors.packageName && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                )}
              />
              {fieldErrors.packageName && (
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.packageName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Giá bán thực tế (VNĐ) *</Label>
                <Input
                  type="number"
                  placeholder="VD: 3500000"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  className={cn(
                    "h-9 text-xs rounded-xl font-mono font-bold bg-background",
                    (fieldErrors.price || isPriceInvalid)
                      ? "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                      : "text-primary border-border"
                  )}
                />
                {fieldErrors.price && (
                  <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.price}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Giá niêm yết gốc (VNĐ) *</Label>
                <Input
                  type="number"
                  placeholder="VD: 4500000"
                  value={originalPrice}
                  onChange={(e) => {
                    setOriginalPrice(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, originalPrice: "", price: "" }));
                  }}
                  className={cn(
                    "h-9 text-xs rounded-xl font-mono font-bold text-muted-foreground border-border bg-background",
                    fieldErrors.originalPrice && "border-destructive bg-destructive/10 focus-visible:ring-destructive"
                  )}
                />
                {fieldErrors.originalPrice && (
                  <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.originalPrice}
                  </p>
                )}
              </div>
            </div>

            {/* Price Alert */}
            {isPriceInvalid && !fieldErrors.price && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Lỗi: Giá bán thực tế ({formatVND(Number(price))}) không được lớn hơn Giá niêm yết gốc ({formatVND(Number(originalPrice))})!
                </span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Thời Hạn Truy Cập (Ngày)</Label>
              <Input
                type="number"
                placeholder="VD: 365"
                value={durationDays}
                onChange={(e) => {
                  setDurationDays(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, durationDays: "" }));
                }}
                className={cn(
                  "h-9 text-xs rounded-xl font-semibold border-border bg-background text-foreground",
                  fieldErrors.durationDays && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                )}
              />
              {fieldErrors.durationDays && (
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.durationDays}
                </p>
              )}
            </div>
          </div>

          {/* 3. Capacity & Tutor Sessions */}
          {deliveryMode === "SELF_STUDY" ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Gói Tự Học (Self-Study) không giới hạn sĩ số và không có buổi kèm riêng đính kèm.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              {deliveryMode !== "ONE_ON_ONE" && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Sĩ số tối đa (maxGroupSize)</Label>
                  <Input
                    type="number"
                    placeholder="VD: 20"
                    value={maxGroupSize}
                    onChange={(e) => {
                      setMaxGroupSize(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, maxGroupSize: "" }));
                    }}
                    className={cn(
                      "h-9 text-xs rounded-xl font-semibold border-border bg-background text-foreground",
                      fieldErrors.maxGroupSize && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.maxGroupSize && (
                    <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.maxGroupSize}
                    </p>
                  )}
                </div>
              )}

              {deliveryMode === "ONE_ON_ONE" && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Sĩ số tối đa</Label>
                  <Input type="number" disabled value={1} className="h-9 text-xs rounded-xl bg-muted font-semibold text-muted-foreground border-border" />
                </div>
              )}

              {(deliveryMode === "GROUP_CLASS" || deliveryMode === "ONE_ON_ONE") && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Số buổi kèm (includedTutorSessions)</Label>
                  <Input
                    type="number"
                    placeholder="VD: 8 buổi"
                    value={includedTutorSessions}
                    onChange={(e) => {
                      setIncludedTutorSessions(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, includedTutorSessions: "" }));
                    }}
                    className={cn(
                      "h-9 text-xs rounded-xl font-semibold border-border bg-background text-foreground",
                      fieldErrors.includedTutorSessions && "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.includedTutorSessions && (
                    <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {fieldErrors.includedTutorSessions}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Class Selection for GROUP_CLASS */}
          {isGroupRequired && (
            <div className={cn(
              "space-y-3 pt-2 border-t border-border p-3 rounded-xl border bg-card",
              fieldErrors.classId ? "border-destructive bg-destructive/10" : "border-amber-500/30 bg-amber-500/5"
            )}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Lớp Học Đính Kèm * (Trạng thái READY)
                </Label>
                <button
                  type="button"
                  onClick={handleNavigateToCreateClass}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  [+ Tạo Lớp Học Mới Ngay] <ExternalLink className="h-3 w-3" />
                </button>
              </div>

              {readyClasses.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 space-y-1 font-medium">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    Chưa có lớp học nào khả dụng cho khóa học này.
                  </p>
                  <p className="text-[11px]">Bấm nút bên trên để tạo lớp học mới ở trang quản lý lớp.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {readyClasses.map((cls) => {
                    const attachedPkg = getAttachedPackage(String(cls.id));
                    const isAttached = Boolean(attachedPkg);
                    const isSelected = selectedClassId === String(cls.id);
                    const classCode = cls.code || `LH-${cls.id}`;

                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          if (isAttached) return;
                          setSelectedClassId(String(cls.id));
                          setFieldErrors((prev) => ({ ...prev, classId: "" }));
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all",
                          isAttached
                            ? "bg-muted border-border opacity-60 cursor-not-allowed text-muted-foreground"
                            : isSelected
                            ? "border-primary bg-primary/10 font-bold cursor-pointer shadow-xs text-foreground"
                            : "border-border hover:bg-muted/50 cursor-pointer text-foreground"
                        )}
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-foreground truncate">{cls.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Mã: {classCode} • Sĩ số: {cls.currentMemberCount || 0}/{cls.maxMembers || 20}
                          </p>
                          {isAttached && (
                            <p className="text-[10px] text-amber-600 font-semibold">🔒 Đã gán gói: {attachedPkg?.name}</p>
                          )}
                        </div>

                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {fieldErrors.classId && (
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.classId}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting || isPriceInvalid}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold cursor-pointer"
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
