import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { salesApi, type DeliveryModeEnum, type CoursePackageFormPayload } from "@/api/sales/salesApi";
import { courseApi } from "@/api/courses/courseApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  Eye,
  EyeOff,
  Info,
} from "lucide-react";

interface CourseOption {
  id: string;
  name: string;
}

const DELIVERY_MODES: { value: DeliveryModeEnum; label: string; desc: string }[] = [
  { value: "SELF_PACED", label: "Tự học (Self-Paced)", desc: "Học viên tự học theo tiến độ cá nhân, truy cập video và tài liệu" },
  { value: "LIVE_CLASS", label: "Lớp Online Live", desc: "Học theo lịch cố định với giảng viên qua video call" },
  { value: "HYBRID", label: "Hybrid (Kết hợp)", desc: "Kết hợp tự học video + các buổi live với giảng viên" },
  { value: "ONE_ON_ONE", label: "Kèm 1-1 (Mentor)", desc: "Kèm cặp 1-1 trực tiếp với mentor chuyên sâu theo yêu cầu" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động (Hiển thị)", color: "text-emerald-600" },
  { value: "INACTIVE", label: "Ẩn (Không hiển thị)", color: "text-zinc-500" },
  { value: "OUT_OF_STOCK", label: "Hết chỗ", color: "text-amber-600" },
] as const;

export const SalesCoursePackageFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const isEdit = Boolean(id) && id !== "new";

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Form state
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryModeEnum>("SELF_PACED");
  const [price, setPrice] = useState<number | "">("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [includedTutorSessions, setIncludedTutorSessions] = useState<number | "">("");
  const [maxGroupSize, setMaxGroupSize] = useState<number | "">("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "OUT_OF_STOCK">("ACTIVE");

  // Load courses for selector
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const res = await courseApi.getAllCourses();
        const list = (res.data?.data || []) as any[];
        setCourses(list.map((c: any) => ({ id: String(c.id), name: c.name || c.title || `Khóa học #${c.id}` })));
      } catch {
        // Fallback: empty list — courseId input becomes manual text
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Load existing package data when editing
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await salesApi.getCoursePackageById(id);
        if (data) {
          setCourseId(String(data.courseId));
          setName(data.name);
          setDescription(data.description || "");
          setDeliveryMode(data.deliveryMode);
          setPrice(data.price);
          setOriginalPrice(data.originalPrice);
          setDurationDays(data.durationDays ?? "");
          setIncludedTutorSessions(data.includedTutorSessions ?? "");
          setMaxGroupSize(data.maxGroupSize ?? "");
          setStatus(data.status as any);
        }
      } catch {
        error("Không thể tải thông tin gói học");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, isEdit]);

  const validate = (): string | null => {
    if (!courseId.trim()) return "Vui lòng chọn khóa học áp dụng";
    if (!name.trim()) return "Vui lòng nhập tên gói học";
    if (!price || Number(price) <= 0) return "Giá bán phải lớn hơn 0";
    if (!originalPrice || Number(originalPrice) <= 0) return "Giá gốc phải lớn hơn 0";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      error(validationError);
      return;
    }

    const payload: CoursePackageFormPayload = {
      courseId: courseId.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      deliveryMode,
      price: Number(price),
      originalPrice: Number(originalPrice),
      durationDays: durationDays !== "" ? Number(durationDays) : undefined,
      includedTutorSessions: includedTutorSessions !== "" ? Number(includedTutorSessions) : undefined,
      maxGroupSize: maxGroupSize !== "" ? Number(maxGroupSize) : undefined,
      status,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await salesApi.updateCoursePackage(id, payload);
        success("Đã cập nhật gói học thành công!");
      } else {
        await salesApi.createCoursePackage(payload);
        success("Đã tạo gói học mới thành công!");
      }
      navigate("/sales/course-packages");
    } catch (err: any) {
      error(err?.response?.data?.message || "Không thể lưu gói học. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const discountPct =
    originalPrice && price && Number(originalPrice) > Number(price)
      ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)
      : null;


  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-16 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-64 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-4">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => navigate("/sales/course-packages")}
          className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại danh sách
        </Button>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-bold text-foreground">
            {isEdit ? "Chỉnh sửa Gói học" : "Tạo Gói học mới"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ─── Basic Info ─── */}
        <Card className="border border-border/40 shadow-xs rounded-xl bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-500" />
              Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4 text-xs">
            {/* Course Selector */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs">
                Khóa học áp dụng <span className="text-rose-500">*</span>
              </Label>
              {coursesLoading ? (
                <div className="h-9 bg-muted animate-pulse rounded-md" />
              ) : courses.length > 0 ? (
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  className="w-full h-9 bg-card border border-border/60 rounded-md px-3 text-xs font-semibold text-foreground"
                >
                  <option value="">— Chọn khóa học —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="Nhập ID khóa học (VD: 12345678)"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="bg-card font-semibold"
                />
              )}
              <p className="text-muted-foreground text-[10px]">
                Gói học này sẽ được gắn vào khóa học được chọn
              </p>
            </div>

            {/* Package Name */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs">
                Tên Gói học <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="VD: Gói Kèm 1-1 Chuyên Sâu Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="bg-card font-semibold"
              />
              <p className="text-muted-foreground text-[10px]">Tối đa 100 ký tự. Nên mô tả ngắn gọn giá trị nổi bật của gói.</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs">Mô tả gói học</Label>
              <Textarea
                placeholder="Mô tả chi tiết quyền lợi, đặc điểm và điều kiện áp dụng của gói học..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-card text-xs resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Delivery Mode ─── */}
        <Card className="border border-border/40 shadow-xs rounded-xl bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-500" />
              Hình thức đào tạo (Delivery Mode)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DELIVERY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setDeliveryMode(mode.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    deliveryMode === mode.value
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-border/40 bg-card hover:border-border"
                  }`}
                >
                  <p
                    className={`font-bold text-[11px] ${
                      deliveryMode === mode.value ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"
                    }`}
                  >
                    {mode.label}
                  </p>
                  <p className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed">
                    {mode.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Conditional extra fields per mode */}
            {(deliveryMode === "ONE_ON_ONE" || deliveryMode === "HYBRID") && (
              <div className="space-y-1.5 pt-1">
                <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-500" />
                  Số buổi kèm riêng (included_tutor_sessions)
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="VD: 8"
                  value={includedTutorSessions}
                  onChange={(e) => setIncludedTutorSessions(e.target.value === "" ? "" : Number(e.target.value))}
                  className="bg-card font-semibold"
                />
              </div>
            )}
            {(deliveryMode === "LIVE_CLASS" || deliveryMode === "HYBRID") && (
              <div className="space-y-1.5 pt-1">
                <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-500" />
                  Sĩ số tối đa lớp học (max_group_size)
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="VD: 20"
                  value={maxGroupSize}
                  onChange={(e) => setMaxGroupSize(e.target.value === "" ? "" : Number(e.target.value))}
                  className="bg-card font-semibold"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Pricing ─── */}
        <Card className="border border-border/40 shadow-xs rounded-xl bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Cấu hình giá bán
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">
                  Giá gốc niêm yết (VNĐ) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="VD: 4500000"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  className="bg-card font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground text-xs">
                  Giá bán khuyến mãi (VNĐ) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="VD: 3280000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  className="bg-card font-bold text-indigo-600"
                />
              </div>
            </div>

            {discountPct !== null && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950 rounded-lg px-3 py-2 border border-rose-200/60 dark:border-rose-800">
                <span className="text-rose-600 dark:text-rose-300 font-black text-sm">-{discountPct}%</span>
                <span className="text-xs text-muted-foreground">
                  Giảm{" "}
                  <strong>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                      Number(originalPrice) - Number(price)
                    )}
                  </strong>{" "}
                  so với giá gốc
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                Thời hạn sử dụng (số ngày, để trống = trọn đời)
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="VD: 365 (1 năm)"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value === "" ? "" : Number(e.target.value))}
                className="bg-card font-semibold"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Status ─── */}
        <Card className="border border-border/40 shadow-xs rounded-xl bg-card">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />
              Trạng thái hiển thị
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`text-center py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                    status === opt.value
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-border/40 bg-card hover:border-border"
                  }`}
                >
                  {opt.value === "ACTIVE" ? (
                    <Eye className={`h-4 w-4 mx-auto mb-1 ${opt.color}`} />
                  ) : opt.value === "INACTIVE" ? (
                    <EyeOff className={`h-4 w-4 mx-auto mb-1 ${opt.color}`} />
                  ) : (
                    <Users className={`h-4 w-4 mx-auto mb-1 ${opt.color}`} />
                  )}
                  <p
                    className={`font-bold text-[10px] leading-tight ${
                      status === opt.value ? "text-indigo-700 dark:text-indigo-300" : opt.color
                    }`}
                  >
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Submit Actions ─── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales/course-packages")}
            disabled={saving}
            className="rounded-lg text-xs font-semibold cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold gap-2 cursor-pointer shadow-sm min-w-30"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isEdit ? "Lưu thay đổi" : "Tạo Gói học"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
