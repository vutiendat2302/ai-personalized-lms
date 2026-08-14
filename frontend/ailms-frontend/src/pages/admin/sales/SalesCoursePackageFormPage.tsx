import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { salesApi, type DeliveryModeEnum, type CoursePackageFormPayload } from "@/api/sales/salesApi";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";
import { ServerCourseSelect } from "@/components/sales/ServerCourseSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  ArrowLeft,
  Save,
  Package,
  RefreshCw,
  BookOpen,
  DollarSign,
  Clock,
  Users,
  Info,
  Plus,
  Check,
  AlertCircle,
  Lock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Format currency display
const formatVND = (val?: number | string) => {
  if (val == null) return "0 ₫";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

// Exact DeliveryModeEnum from Backend: SELF_STUDY, GROUP_CLASS, ONE_ON_ONE, COMBO
const DELIVERY_MODES: { value: DeliveryModeEnum; label: string; desc: string }[] = [
  { value: "SELF_STUDY", label: "Gói Tự Học (Self-Study)", desc: "Học viên tự học theo tiến độ cá nhân qua video & tài liệu tự do" },
  { value: "GROUP_CLASS", label: "Lớp Học Nhóm (Group Class)", desc: "Lớp nhóm tương tác sĩ số cố định (Bắt buộc đính kèm Lớp học)" },
  { value: "ONE_ON_ONE", label: "Gia Sư 1 Kèm 1 (One-on-One)", desc: "Kèm riêng 1-on-1 (Sĩ số cố định = 1, không bắt buộc gắn lớp)" },
  { value: "COMBO", label: "Gói Combo Hỗn Hợp (Combo)", desc: "Kết hợp Tự học + Lớp học. Nếu sĩ số = 1 (kèm 1-1 + tự học), không cần đính kèm lớp; nếu sĩ số > 1 bắt buộc đính kèm lớp" },
];

// Exact CoursePackageStatusEnum from Backend: ACTIVE, INACTIVE, OUT_OF_STOCK
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động (ACTIVE - Có thể đăng ký)", color: "text-emerald-600" },
  { value: "INACTIVE", label: "Không hoạt động (INACTIVE - Ẩn khỏi shop)", color: "text-zinc-500" },
  { value: "OUT_OF_STOCK", label: "Hết chỗ (OUT_OF_STOCK - Lớp liên kết đã hết chỗ)", color: "text-rose-600" },
] as const;

export const SalesCoursePackageFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const isEdit = Boolean(id) && id !== "new";

  const locationState = location.state as {
    createdClassId?: string;
    createdClassName?: string;
  } | null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Form states
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeEnum>("SELF_STUDY");
  const [price, setPrice] = useState<number | "">("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [includedTutorSessions, setIncludedTutorSessions] = useState<number | "">("");
  const [maxGroupSize, setMaxGroupSize] = useState<number | "">("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "OUT_OF_STOCK">("ACTIVE");

  // 🌟 SHADCN INLINE UI FIELD ERRORS STATE 🌟
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Class Selection Dialog states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classList, setClassList] = useState<any[]>([]);
  const [attachedClassIds, setAttachedClassIds] = useState<Set<string>>(new Set());
  const [classLoading, setClassLoading] = useState(false);

  // Handle returning from CreateGroupClassPage (/admin/classes/create)
  useEffect(() => {
    if (locationState?.createdClassId) {
      const newClsId = String(locationState.createdClassId);
      setClassId(newClsId);
      if (locationState.createdClassName) {
        setClassName(locationState.createdClassName);
      }
      setFieldErrors((prev) => ({ ...prev, classId: "" }));
    }
  }, [locationState]);

  // Load existing package data when editing
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await salesApi.getCoursePackageById(id);
        if (data) {
          setCourseId(String(data.courseId));
          setCourseName(data.courseName || "");
          setClassId(data.classId ? String(data.classId) : null);
          setClassName(data.className || null);
          setName(data.name);
          setDescription(data.description || "");
          setDeliveryMode(data.deliveryMode || "SELF_STUDY");
          setPrice(data.price);
          setOriginalPrice(data.originalPrice);
          setDurationDays(data.durationDays ?? "");
          setIncludedTutorSessions(data.includedTutorSessions ?? "");
          setMaxGroupSize(data.maxGroupSize ?? (data.deliveryMode === "ONE_ON_ONE" ? 1 : ""));
          setStatus(data.status as any);
        }
      } catch {
        error("Không thể tải thông tin chi tiết gói học");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, isEdit, error]);

  // Handle ONE_ON_ONE default maxGroupSize = 1
  useEffect(() => {
    if (deliveryMode === "ONE_ON_ONE") {
      setMaxGroupSize(1);
    }
  }, [deliveryMode]);

  // Load classes for course when courseId changes
  const loadClassesForCourse = useCallback(async (targetCourseId: string) => {
    if (!targetCourseId || targetCourseId === "ALL") {
      setClassList([]);
      return;
    }
    setClassLoading(true);
    try {
      const [classes, packages] = await Promise.all([
        adminCourseClassApi.getClassesByCourse(targetCourseId),
        adminCourseClassApi.getPackagesByCourse(targetCourseId),
      ]);

      const attachedSet = new Set<string>();
      if (Array.isArray(packages)) {
        packages.forEach((pkg: any) => {
          if (pkg.classId && String(pkg.id) !== id) {
            attachedSet.add(String(pkg.classId));
          }
        });
      }

      setAttachedClassIds(attachedSet);
      setClassList(Array.isArray(classes) ? classes : []);
    } catch {
      setClassList([]);
    } finally {
      setClassLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (courseId && courseId !== "ALL") {
      loadClassesForCourse(courseId);
    }
  }, [courseId, loadClassesForCourse]);

  // Open class modal
  const handleOpenClassModal = () => {
    if (!courseId || courseId === "ALL") {
      setFieldErrors((prev) => ({ ...prev, courseId: "Vui lòng chọn Khóa học trước khi chọn Lớp học đính kèm!" }));
      error("Vui lòng chọn Khóa học trước khi chọn Lớp học đính kèm!");
      return;
    }
    setClassModalOpen(true);
    loadClassesForCourse(courseId);
  };

  // 🌟 NAVIGATE TO OFFICIAL CREATE CLASS PAGE (/admin/classes/create) LIKE IN COURSE MANAGEMENT 🌟
  const handleNavigateToCreateClass = () => {
    if (!courseId || courseId === "ALL") {
      setFieldErrors((prev) => ({ ...prev, courseId: "Vui lòng chọn Khóa học áp dụng trước khi tạo Lớp học mới!" }));
      error("Vui lòng chọn Khóa học áp dụng trước khi tạo Lớp học mới!");
      return;
    }
    setClassModalOpen(false);
    navigate("/admin/classes/create", {
      state: {
        courseId,
        courseName,
        returnUrl: location.pathname,
      },
    });
  };

  // 🌟 QUY ĐỊNH LỚP HỌC ĐÍNH KÈM (CLASS ATTACHMENT LOGIC) 🌟
  const numMaxGroupSize = Number(maxGroupSize) || 0;
  const isGroupRequired =
    deliveryMode === "GROUP_CLASS" ||
    (deliveryMode === "COMBO" && numMaxGroupSize > 1);

  // 🌟 SHADCN FORM VALIDATION FUNCTION 🌟
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!isEdit && (!courseId.trim() || courseId === "ALL")) {
      errs.courseId = "Vui lòng chọn Khóa học áp dụng!";
    }

    if (!name.trim()) {
      errs.name = "Vui lòng nhập Tên gói bán sản phẩm!";
    } else if (name.trim().length > 100) {
      errs.name = "Tên gói bán không được vượt quá 100 ký tự!";
    }

    // 1. Price validation
    if (price === "" || price == null || isNaN(Number(price))) {
      errs.price = "Vui lòng nhập Giá bán thực tế!";
    } else if (Number(price) < 0) {
      errs.price = "Giá bán thực tế phải lớn hơn hoặc bằng 0!";
    }

    // 2. Original Price validation
    if (originalPrice === "" || originalPrice == null || isNaN(Number(originalPrice))) {
      errs.originalPrice = "Vui lòng nhập Giá niêm yết gốc!";
    } else if (Number(originalPrice) < 0) {
      errs.originalPrice = "Giá niêm yết gốc phải lớn hơn hoặc bằng 0!";
    }

    // 3. Price vs OriginalPrice comparison validation
    if (
      price !== "" &&
      originalPrice !== "" &&
      Number(price) > Number(originalPrice)
    ) {
      errs.price = `Giá bán thực tế (${formatVND(Number(price))}) không được lớn hơn Giá niêm yết gốc (${formatVND(Number(originalPrice))})!`;
    }

    // 4. Duration validation
    if (durationDays !== "" && durationDays != null) {
      const numDuration = Number(durationDays);
      if (isNaN(numDuration) || numDuration <= 0) {
        errs.durationDays = "Thời hạn truy cập (ngày) phải lớn hơn 0!";
      }
    }

    // 5. Tutor sessions validation
    if (deliveryMode === "GROUP_CLASS" || deliveryMode === "ONE_ON_ONE" || deliveryMode === "COMBO") {
      if (includedTutorSessions !== "" && includedTutorSessions != null) {
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
      if (!classId) {
        errs.classId = "Gói Lớp Nhóm bắt buộc phải chọn Lớp học đính kèm!";
      }
    } else if (deliveryMode === "COMBO") {
      if (numMaxGroupSize > 1 && !classId) {
        errs.classId = "Gói Combo có sĩ số > 1 bắt buộc phải chọn Lớp học đính kèm!";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      error("Thông tin nhập chưa hợp lệ. Vui lòng kiểm tra các ô báo đỏ bên dưới!");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        const updatePayload = {
          name: name.trim(),
          description: description.trim() || undefined,
          price: Number(price),
          originalPrice: Number(originalPrice),
          durationDays: durationDays !== "" ? Number(durationDays) : undefined,
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
          status,
        };

        await salesApi.updateCoursePackage(id, updatePayload as any);
        success("Đã cập nhật gói học thành công!");
      } else {
        const createPayload: CoursePackageFormPayload = {
          courseId: courseId.trim(),
          classId: isGroupRequired ? classId || undefined : undefined,
          name: name.trim(),
          description: description.trim() || undefined,
          deliveryMode,
          price: Number(price),
          originalPrice: Number(originalPrice),
          durationDays: durationDays !== "" ? Number(durationDays) : undefined,
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
          status,
        };

        await salesApi.createCoursePackage(createPayload);
        success("Đã tạo gói học mới thành công!");
      }
      navigate("/sales/course-packages");
    } catch (err: any) {
      error(err?.response?.data?.message || "Không thể lưu gói học. Vui lòng kiểm tra lại thông tin!");
    } finally {
      setSaving(false);
    }
  };

  const isPriceInvalid =
    price !== "" &&
    originalPrice !== "" &&
    Number(price) > Number(originalPrice);

  const discountPct =
    originalPrice && price && Number(originalPrice) > Number(price)
      ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)
      : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-16 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3" />
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate("/sales/course-packages")}
            className="rounded-xl gap-1.5 text-xs font-semibold cursor-pointer h-9 px-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {isEdit ? `Chỉnh sửa Gói học` : "Tạo Gói học bán mới"}
            </h1>
          </div>
        </div>
      </div>

      {/* 🌟 FORM WITH NOVALIDATE TO DISABLE NATIVE BROWSER TOOLTIPS 🌟 */}
      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        {/* ─── 1. Basic Info & Course Selection ─── */}
        <Card className="border border-border/40 shadow-2xs rounded-2xl bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-border/30 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              1. Thông tin Khóa học & Tên gói bán
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {/* Course Selector */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs flex items-center justify-between">
                <span>Khóa học áp dụng <span className="text-rose-500">*</span></span>
                {isEdit && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-normal">
                    <Lock className="h-3 w-3 text-amber-500" /> Không thể đổi khóa học khi update
                  </span>
                )}
              </Label>

              <ServerCourseSelect
                value={courseId}
                onChange={(selectedId, selectedName) => {
                  if (isEdit) return;
                  setCourseId(selectedId);
                  if (selectedName) setCourseName(selectedName);
                  setClassId(null);
                  setClassName(null);
                  setFieldErrors((prev) => ({ ...prev, courseId: "" }));
                }}
                disabled={isEdit}
                allowAll={false}
                placeholder="Tìm & chọn khóa học áp dụng..."
                className={cn(
                  "w-full h-10 text-xs font-semibold",
                  fieldErrors.courseId && "border-rose-500 ring-rose-500"
                )}
              />

              {fieldErrors.courseId ? (
                <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.courseId}
                </p>
              ) : (
                <p className="text-muted-foreground text-[10px]">
                  {courseName ? `Đã chọn: ${courseName}` : "Hệ thống hỗ trợ di chuột (hover) để xem chi tiết khóa học & phân trang server-side."}
                </p>
              )}
            </div>

            {/* Package Name */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs">
                Tên Gói bán sản phẩm <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="VD: Gói Tự Học Standard (Lifetime) - Chuyên sâu Mạng máy tính"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={cn(
                  "bg-background font-semibold h-10 rounded-xl",
                  fieldErrors.name && "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500"
                )}
              />
              {fieldErrors.name ? (
                <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.name}
                </p>
              ) : (
                <p className="text-muted-foreground text-[10px]">Tối đa 100 ký tự. Nên mô tả ngắn gọn giá trị nổi bật của gói bán.</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs">Mô tả chi tiết gói học</Label>
              <Textarea
                placeholder="Mô tả chi tiết quyền lợi, lộ trình học và ưu đãi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-background text-xs resize-none rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── 2. Delivery Mode & Class Attachment ─── */}
        <Card className="border border-border/40 shadow-2xs rounded-2xl bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-border/30 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                2. Hình thức Đào tạo (DeliveryModeEnum) & Lớp học
              </span>
              {isEdit && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-normal">
                  <Lock className="h-3 w-3 text-amber-500" /> Cố định hình thức
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {/* Delivery Mode selector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DELIVERY_MODES.map((mode) => {
                const isSelected = deliveryMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    disabled={isEdit}
                    onClick={() => {
                      if (isEdit) return;
                      setDeliveryMode(mode.value);
                      setFieldErrors((prev) => ({ ...prev, classId: "", maxGroupSize: "", includedTutorSessions: "" }));
                    }}
                    className={cn(
                      "text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-2xs font-medium"
                        : "border-border/40 bg-card hover:border-border/80",
                      isEdit && !isSelected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-bold text-xs", isSelected ? "text-primary" : "text-foreground")}>
                        {mode.label}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">{mode.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Class Selection logic for GROUP_CLASS / COMBO */}
            {isGroupRequired ? (
              <div className={cn(
                "p-4 rounded-2xl border space-y-3 transition-all",
                fieldErrors.classId
                  ? "border-rose-500 bg-rose-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              )}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-amber-600" />
                      Lớp học đính kèm <span className="text-rose-500">* (Bắt buộc cho Lớp nhóm / Combo)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {deliveryMode === "COMBO"
                        ? "Gói Combo có sĩ số > 1 bắt buộc phải chọn Lớp học đính kèm"
                        : "Gói Lớp Nhóm bắt buộc phải chọn hoặc tạo mới Lớp học đính kèm"}
                    </p>
                  </div>

                  {!isEdit && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenClassModal}
                        className="rounded-xl text-xs font-bold gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer h-8 px-2.5"
                      >
                        {classId ? "Đổi Lớp" : "Chọn Lớp có sẵn"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleNavigateToCreateClass}
                        className="rounded-xl text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer h-8 px-2.5 shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tạo Lớp mới
                      </Button>
                    </div>
                  )}
                </div>

                {classId ? (
                  <div className="p-3 rounded-xl bg-background border border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-extrabold text-foreground">{className || `Lớp #${classId}`}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ID Lớp: {classId}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold text-[10px]">
                      Đã chọn đính kèm
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-background/80 border border-dashed border-amber-400 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Chưa đính kèm Lớp học nào.</span>
                    </div>
                    {!isEdit && (
                      <button
                        type="button"
                        onClick={handleNavigateToCreateClass}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        [+ Tạo Lớp Học Mới Ngay] <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}

                {fieldErrors.classId && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.classId}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/40 text-muted-foreground text-xs flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-500" />
                <span>
                  {deliveryMode === "COMBO" && numMaxGroupSize === 1
                    ? "Gói Combo có sĩ số = 1 được hiểu là Gói 1-1 + Tự học, KHÔNG bắt buộc gắn Lớp học."
                    : "Hình thức này không yêu cầu gắn Lớp học đính kèm."}
                </span>
              </div>
            )}

            {/* Capacity & Tutor sessions */}
            {deliveryMode === "SELF_STUDY" ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Gói Tự Học (Self-Study) là hình thức học viên chủ động học qua video & tài liệu. Gói này không áp dụng sĩ số tối đa và không có buổi kèm riêng đính kèm.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {deliveryMode !== "ONE_ON_ONE" && (
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      Sĩ số tối đa học viên (maxGroupSize)
                    </Label>
                    <Input
                      type="number"
                      placeholder="VD: 20 học viên"
                      value={maxGroupSize}
                      onChange={(e) => {
                        setMaxGroupSize(e.target.value === "" ? "" : Number(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, maxGroupSize: "" }));
                      }}
                      className={cn(
                        "bg-background font-semibold h-9 rounded-xl",
                        fieldErrors.maxGroupSize && "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500"
                      )}
                    />
                    {fieldErrors.maxGroupSize ? (
                      <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.maxGroupSize}
                      </p>
                    ) : (
                      deliveryMode === "COMBO" && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          Nếu sĩ số = 1: Combo 1-1 + Tự học (không gắn lớp). Nếu sĩ số &gt; 1: Combo Lớp nhóm (bắt buộc gắn lớp).
                        </p>
                      )
                    )}
                  </div>
                )}

                {deliveryMode === "ONE_ON_ONE" && (
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      Sĩ số tối đa học viên
                    </Label>
                    <Input
                      type="number"
                      disabled
                      value={1}
                      className="bg-muted font-semibold h-9 rounded-xl text-muted-foreground"
                    />
                    <p className="text-[10px] text-purple-600 dark:text-purple-400">
                      Hình thức Gia sư 1-1 sĩ số học sinh luôn cố định là 1.
                    </p>
                  </div>
                )}

                {/* 🌟 Hỗ trợ số buổi kèm riêng cho GROUP_CLASS, ONE_ON_ONE và COMBO 🌟 */}
                {(deliveryMode === "GROUP_CLASS" || deliveryMode === "ONE_ON_ONE" || deliveryMode === "COMBO") && (
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500" />
                      Số buổi kèm riêng (includedTutorSessions)
                    </Label>
                    <Input
                      type="number"
                      placeholder="VD: 8 buổi kèm"
                      value={includedTutorSessions}
                      onChange={(e) => {
                        setIncludedTutorSessions(e.target.value === "" ? "" : Number(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, includedTutorSessions: "" }));
                      }}
                      className={cn(
                        "bg-background font-semibold h-9 rounded-xl",
                        fieldErrors.includedTutorSessions && "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500"
                      )}
                    />
                    {fieldErrors.includedTutorSessions && (
                      <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.includedTutorSessions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── 3. Pricing & Status ─── */}
        <Card className="border border-border/40 shadow-2xs rounded-2xl bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-border/30 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              3. Cấu hình Giá bán & Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">
                  Giá bán thực tế (price) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="VD: 4550000"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value === "" ? "" : Number(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  className={cn(
                    "bg-background font-mono font-bold h-10 rounded-xl",
                    (fieldErrors.price || isPriceInvalid)
                      ? "border-rose-500 bg-rose-500/5 text-rose-600 focus-visible:ring-rose-500"
                      : "text-primary"
                  )}
                />
                {fieldErrors.price && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.price}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">
                  Giá niêm yết gốc (originalPrice) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="VD: 5687500"
                  value={originalPrice}
                  onChange={(e) => {
                    setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, originalPrice: "", price: "" }));
                  }}
                  className={cn(
                    "bg-background font-mono font-bold text-muted-foreground h-10 rounded-xl",
                    fieldErrors.originalPrice && "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500"
                  )}
                />
                {fieldErrors.originalPrice && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.originalPrice}
                  </p>
                )}
              </div>
            </div>

            {/* 🚨 RED WARNING ALERT WHEN PRICE > ORIGINAL_PRICE 🚨 */}
            {isPriceInvalid && !fieldErrors.price && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>
                  Lỗi Validation: Giá bán thực tế (<strong>{formatVND(Number(price))}</strong>) không được lớn hơn Giá niêm yết gốc (<strong>{formatVND(Number(originalPrice))}</strong>)!
                </span>
              </div>
            )}

            {discountPct !== null && !isPriceInvalid && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between">
                <span>Ưu đãi áp dụng tự động cho học viên:</span>
                <span className="font-black font-mono text-sm bg-emerald-500 text-white px-2.5 py-0.5 rounded-full">
                  -{discountPct}%
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">Thời hạn truy cập (Ngày)</Label>
                <Input
                  type="number"
                  placeholder="VD: 365 ngày"
                  value={durationDays}
                  onChange={(e) => {
                    setDurationDays(e.target.value === "" ? "" : Number(e.target.value));
                    setFieldErrors((prev) => ({ ...prev, durationDays: "" }));
                  }}
                  className={cn(
                    "bg-background font-semibold h-9 rounded-xl",
                    fieldErrors.durationDays && "border-rose-500 bg-rose-500/5 focus-visible:ring-rose-500"
                  )}
                />
                {fieldErrors.durationDays && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.durationDays}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">
                  Trạng thái sản phẩm <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 bg-background border border-border/60 rounded-xl px-3 text-xs font-bold text-foreground"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales/course-packages")}
            disabled={saving}
            className="rounded-xl text-xs font-semibold cursor-pointer h-10 px-5"
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            disabled={saving || isPriceInvalid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold gap-2 cursor-pointer h-10 px-6 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Cập nhật Gói bán" : "Tạo Gói bán Mới"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Class Selection Modal */}
      <Dialog open={classModalOpen} onOpenChange={setClassModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="h-4 w-4 text-primary" />
              Chọn Lớp học cho Khóa học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chỉ các lớp chưa được gắn vào gói bán khác mới có thể chọn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-foreground">Danh sách lớp học có sẵn</span>
              <button
                type="button"
                onClick={handleNavigateToCreateClass}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                [+ Tạo Lớp Học Mới Ngay] <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {classLoading ? (
              <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Đang tải danh sách lớp học...</span>
              </div>
            ) : classList.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs space-y-2 bg-muted/30 rounded-xl">
                <p className="font-semibold text-foreground">Chưa có lớp học nào cho khóa học này</p>
                <p>Bạn có thể tạo mới lớp học bằng nút bên dưới.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {classList.map((cls) => {
                  const clsId = String(cls.id);
                  const isAttached = attachedClassIds.has(clsId);
                  const isSelected = classId === clsId;

                  return (
                    <div
                      key={clsId}
                      onClick={() => {
                        if (isAttached) return;
                        setClassId(clsId);
                        setClassName(cls.name || `Lớp #${clsId}`);
                        setFieldErrors((prev) => ({ ...prev, classId: "" }));
                        setClassModalOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between text-xs transition-all",
                        isAttached
                          ? "bg-muted/40 border-border/40 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/10 border-primary font-bold cursor-pointer"
                          : "bg-card border-border/60 hover:bg-muted/50 cursor-pointer"
                      )}
                    >
                      <div>
                        <p className="font-extrabold text-foreground">{cls.name || `Lớp #${clsId}`}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Mã: {cls.code || clsId} • Sĩ số: {cls.currentMemberCount || 0}/{cls.maxMembers || 20}
                        </p>
                      </div>

                      {isAttached ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          Đã gắn gói bán
                        </span>
                      ) : isSelected ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary hover:underline">Chọn lớp</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Link to Official Create Class Page */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Muốn thiết lập đầy đủ lịch học & giảng viên?</span>
              <Button
                type="button"
                size="sm"
                onClick={handleNavigateToCreateClass}
                className="h-8 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                [+ Tạo Lớp Học Mới Ngay]
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
