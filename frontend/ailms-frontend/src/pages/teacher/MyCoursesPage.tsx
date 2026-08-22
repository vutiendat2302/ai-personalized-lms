import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Plus,
  Star,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layers,
  DollarSign,
  Eye,
  Loader2,
  Check,
} from "lucide-react";

type FilterStatus = "" | "ACTIVE" | "PENDING" | "REJECTED" | "DRAFT";

export function MyCoursesPage() {
  const { auth } = useAuth();
  const userId = auth.user?.id;

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Wizard State
  const [courseForm, setCourseForm] = useState({
    name: "",
    categoryId: "",
    level: "BEGINNER",
    description: "",
    coverImage: "",
    price: 0,
    deliveryMode: "SELF_STUDY", // SELF_STUDY | GROUP | ONE_ON_ONE
    chapters: [{ title: "Chương 1: Giới thiệu tổng quan", lessons: [{ title: "Bài 1: Làm quen khái niệm" }] }],
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Toast banner
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const fetchMyCourses = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await courseApi.searchCourses({
        createdBy: userId,
        status: statusFilter || undefined,
        page: 0,
        size: 100,
        sortBy: "createdAt",
        sortDirection: "DESC",
      });
      setCourses(res.data?.data?.content || []);
    } catch (err: any) {
      showBanner("Lỗi khi tải danh sách khóa học của bạn", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, [userId, statusFilter]);

  useEffect(() => {
    courseApi.getAllCategories().then((res) => {
      setCategories(res.data?.data || []);
    }).catch(() => null);
  }, []);

  const countByStatus = (status: FilterStatus) => {
    if (!status) return courses.length;
    return courses.filter((c) => c.status === status).length;
  };

  const handleCreateCourseSubmit = async () => {
    if (!courseForm.name.trim()) {
      showBanner("Vui lòng nhập tên khóa học", true);
      return;
    }
    setSubmitting(true);
    try {
      if (!userId) {
        showBanner("Không xác định được tài khoản giảng viên", true);
        return;
      }
      await courseApi.createTeacherCourse(userId, {
        name: courseForm.name,
        categoryId: courseForm.categoryId,
        link: "",
        level: courseForm.level,
        description: courseForm.description,
      });

      showBanner("Đã tạo bản nháp. Hãy hoàn thiện nội dung rồi gửi duyệt.");
      setIsWizardOpen(false);
      setWizardStep(1);
      setCourseForm({
        name: "",
        categoryId: "",
        level: "BEGINNER",
        description: "",
        coverImage: "",
        price: 0,
        deliveryMode: "SELF_STUDY",
        chapters: [{ title: "Chương 1: Giới thiệu tổng quan", lessons: [{ title: "Bài 1: Làm quen khái niệm" }] }],
      });
      await fetchMyCourses();
    } catch (err: any) {
      showBanner("Lỗi khi gửi yêu cầu tạo khóa học", true);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
    DRAFT: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  const statusLabelMap: Record<string, string> = {
    ACTIVE: "Đang Bán",
    PENDING: "Chờ Duyệt",
    REJECTED: "Bị Từ Chối",
    DRAFT: "Nháp",
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Banner */}
      {bannerMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            bannerMsg.isError
              ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800"
          }`}
        >
          {bannerMsg.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* VIEW 1: MY COURSES LIST */}
      {!isWizardOpen ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight font-heading flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" /> Khóa Học Của Tôi
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý gian hàng nội dung bài giảng, theo dõi trạng thái phê duyệt và cập nhật nội dung.
              </p>
            </div>

            <Button
              onClick={() => setIsWizardOpen(true)}
              className="gap-2 rounded-xl text-xs font-bold shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" /> Tạo Khóa Học
            </Button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Tất cả", value: "" as FilterStatus },
              { label: "Đang bán", value: "ACTIVE" as FilterStatus },
              { label: "Chờ duyệt", value: "PENDING" as FilterStatus },
              { label: "Bị từ chối", value: "REJECTED" as FilterStatus },
              { label: "Nháp", value: "DRAFT" as FilterStatus },
            ].map((chip) => {
              const isActive = statusFilter === chip.value;
              const count = countByStatus(chip.value);

              return (
                <button
                  key={chip.value}
                  onClick={() => setStatusFilter(chip.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Course Product Grid (3 Columns, Storefront Style) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <Skeleton className="aspect-video rounded-2xl" />
              <Skeleton className="aspect-video rounded-2xl" />
              <Skeleton className="aspect-video rounded-2xl" />
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isRejected = course.status === "REJECTED";

                return (
                  <div
                    key={course.id}
                    className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Product Image Cover (16:9) */}
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {course.coverImage || course.imageUrl ? (
                          <img
                            src={course.coverImage || course.imageUrl}
                            alt={course.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-primary/10">
                            <BookOpen className="h-12 w-12 text-primary/40" />
                          </div>
                        )}

                        <span
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                            statusColorMap[course.status] || "bg-gray-500/10 text-gray-600 border-gray-500/20"
                          }`}
                        >
                          {statusLabelMap[course.status] || course.status}
                        </span>
                      </div>

                      {/* Card Info */}
                      <div className="p-4 space-y-3">
                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {course.name}
                        </h3>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-extrabold text-foreground text-sm">
                            {Number(course.suggestedPrice || course.price || 0).toLocaleString("vi-VN")} đ
                          </span>

                          <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-primary" /> {course.enrollmentCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> {course.avgRating || 5.0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Red Strip for Rejected Reason */}
                    {isRejected && (
                      <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-600 text-[11px] truncate">
                        <b>Lý do từ chối:</b> {course.rejectionReason || "Cần điều chỉnh nội dung theo quy chuẩn."}
                      </div>
                    )}

                    {/* Card Action */}
                    <div className="p-4 pt-2 border-t border-border/40">
                      <Link to={`/courses/${course.id}`} className="block w-full">
                        <Button
                          variant={isRejected ? "default" : "outline"}
                          className={`w-full text-xs font-bold rounded-xl h-9 ${
                            isRejected ? "bg-red-600 hover:bg-red-700 text-white" : ""
                          }`}
                        >
                          {isRejected ? "Sửa & Gửi lại" : "Xem khóa học"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border/80 rounded-2xl p-16 text-center space-y-3">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base">Bạn chưa có khóa học nào</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Bắt đầu đóng góp bài giảng và chia sẻ kiến thức chuyên môn bằng cách tạo khóa học mới.
              </p>
              <Button onClick={() => setIsWizardOpen(true)} className="gap-2 rounded-xl text-xs font-bold">
                <Plus className="h-4 w-4" /> Tạo Khóa Học Ngay
              </Button>
            </div>
          )}
        </>
      ) : (
        /* VIEW 2: CREATE COURSE MULTI-STEP WIZARD */
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header Wizard */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWizardOpen(false)}
                className="gap-1 text-xs rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" /> Hủy tạo
              </Button>
              <h2 className="text-lg font-bold">Quy Trình Tạo Khóa Học Mới</h2>
            </div>
          </div>

          {/* Wizard Horizontal Progress Step Indicator */}
          <div className="grid grid-cols-4 gap-2 bg-card border border-border/60 p-3 rounded-2xl shadow-2xs">
            {[
              { step: 1, label: "① Thông tin cơ bản" },
              { step: 2, label: "② Chương / Bài học" },
              { step: 3, label: "③ Định giá & Gói bán" },
              { step: 4, label: "④ Xem trước & Gửi" },
            ].map((st) => (
              <div
                key={st.step}
                onClick={() => setWizardStep(st.step as any)}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                  wizardStep === st.step
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : wizardStep > st.step
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {st.label}
              </div>
            ))}
          </div>

          {/* STEP CONTENT PANELS */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-2xs space-y-5">
            {/* STEP 1: Thông tin cơ bản */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase text-primary tracking-wider">Bước 1: Thông Tin Cơ Bản</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Tên khóa học (*)</Label>
                  <Input
                    placeholder="VD: Lập trình ReactJS & TypeScript chuyên sâu từ A-Z"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
                    className="text-xs rounded-xl h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Danh mục (*)</Label>
                    <select
                      value={courseForm.categoryId}
                      onChange={(e) => setCourseForm((p) => ({ ...p, categoryId: e.target.value }))}
                      className="w-full h-10 text-xs bg-background border border-border/60 rounded-xl px-3"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Trình độ</Label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm((p) => ({ ...p, level: e.target.value }))}
                      className="w-full h-10 text-xs bg-background border border-border/60 rounded-xl px-3"
                    >
                      <option value="BEGINNER">Cơ bản (Beginner)</option>
                      <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                      <option value="ADVANCED">Nâng cao (Advanced)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Mô tả ngắn khóa học</Label>
                  <Textarea
                    placeholder="Tóm tắt mục tiêu và giá trị học viên đạt được sau khóa học..."
                    value={courseForm.description}
                    onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Link Ảnh Bìa (Cover Image URL)</Label>
                  <Input
                    placeholder="https://images.unsplash.com/photo-..."
                    value={courseForm.coverImage}
                    onChange={(e) => setCourseForm((p) => ({ ...p, coverImage: e.target.value }))}
                    className="text-xs rounded-xl h-10"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Chương / Bài học */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase text-primary tracking-wider">Bước 2: Cấu Trúc Bài Học</h3>

                <div className="space-y-3">
                  {courseForm.chapters.map((chap, cIdx) => (
                    <div key={cIdx} className="border border-border/60 rounded-xl p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Input
                          value={chap.title}
                          onChange={(e) => {
                            const newCh = [...courseForm.chapters];
                            newCh[cIdx].title = e.target.value;
                            setCourseForm((p) => ({ ...p, chapters: newCh }));
                          }}
                          className="font-bold text-xs bg-card h-9 rounded-lg"
                        />
                      </div>

                      <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                        {chap.lessons.map((les, lIdx) => (
                          <Input
                            key={lIdx}
                            value={les.title}
                            onChange={(e) => {
                              const newCh = [...courseForm.chapters];
                              newCh[cIdx].lessons[lIdx].title = e.target.value;
                              setCourseForm((p) => ({ ...p, chapters: newCh }));
                            }}
                            className="text-xs bg-card h-8 rounded-lg"
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newCh = [...courseForm.chapters];
                            newCh[cIdx].lessons.push({ title: `Bài ${newCh[cIdx].lessons.length + 1}: Bài học mới` });
                            setCourseForm((p) => ({ ...p, chapters: newCh }));
                          }}
                          className="text-[11px] h-7 text-primary"
                        >
                          + Thêm bài học
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCourseForm((p) => ({
                        ...p,
                        chapters: [
                          ...p.chapters,
                          { title: `Chương ${p.chapters.length + 1}: Chương mới`, lessons: [{ title: "Bài 1: Nội dung mới" }] },
                        ],
                      }));
                    }}
                    className="w-full text-xs font-bold rounded-xl"
                  >
                    + Thêm Chương Mới
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Định giá & Gói bán (Card Selection) */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase text-primary tracking-wider">Bước 3: Định Giá & Hình Thức Bán</h3>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Giá đề xuất (VND)</Label>
                  <Input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm((p) => ({ ...p, price: Number(e.target.value) || 0 }))}
                    className="text-xs rounded-xl h-10 font-bold"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold">Hình Thức Triển Khai (Delivery Mode)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "SELF_STUDY", label: "Self-Study (Tự Học Online)", desc: "Học viên tự học qua video có sẵn" },
                      { id: "GROUP", label: "Group Class (Lớp Nhóm)", desc: "Học theo lịch trình lớp trực tuyến" },
                      { id: "ONE_ON_ONE", label: "1-1 Coaching (Kèm Cặp)", desc: "Giảng dạy 1 kèm 1 chuyên sâu" },
                    ].map((mode) => {
                      const isSelected = courseForm.deliveryMode === mode.id;

                      return (
                        <div
                          key={mode.id}
                          onClick={() => setCourseForm((p) => ({ ...p, deliveryMode: mode.id }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-1 ${
                            isSelected
                              ? "bg-primary/10 border-primary font-bold text-primary shadow-2xs"
                              : "bg-card border-border/60 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{mode.label}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-normal">{mode.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Xem trước & Gửi duyệt */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase text-primary tracking-wider">Bước 4: Xem Trước & Gửi Duyệt</h3>

                <div className="border border-border/60 rounded-xl p-5 space-y-4 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold">
                      {categories.find((c) => String(c.id) === String(courseForm.categoryId))?.name || "Chưa chọn danh mục"}
                    </span>
                    <span className="text-lg font-black text-primary">
                      {Number(courseForm.price).toLocaleString("vi-VN")} đ
                    </span>
                  </div>

                  <h2 className="text-lg font-bold">{courseForm.name || "Chưa nhập tên khóa học"}</h2>

                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {courseForm.description || "Chưa có mô tả."}
                  </p>

                  <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <b>Cấu trúc:</b> {courseForm.chapters.length} chương bài học
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WIZARD NAVIGATION FOOTER */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((prev) => (prev - 1) as any)}
              className="text-xs font-bold rounded-xl gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>

            {wizardStep < 4 ? (
              <Button
                onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                className="text-xs font-bold rounded-xl gap-1"
              >
                Tiếp theo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                disabled={submitting}
                onClick={handleCreateCourseSubmit}
                className="text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gửi Duyệt Khóa Học
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCoursesPage;
