import React, { useEffect, useState } from "react";
import { courseApi } from "@/api/courses/courseApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export function CourseApprovalPage() {
  const [statusTab, setStatusTab] = useState<"PENDING" | "ACTIVE" | "REJECTED">("PENDING");
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // Reject Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectCourseTarget, setRejectCourseTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Accordion expanded state in detail view
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Banner toast
  const [bannerMsg, setBannerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showBanner = (text: string, isError = false) => {
    setBannerMsg({ text, isError });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await courseApi.searchCourses({
        status: statusTab,
        page: 0,
        size: 100,
        sortBy: "createdAt",
        sortDirection: "ASC",
      });
      setCourses(res.data?.data?.content || []);
    } catch (err: any) {
      showBanner("Lỗi khi tải danh sách duyệt khóa học", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    setSelectedCourse(null);
  }, [statusTab]);

  const handleApprove = async (course: any) => {
    setActionBusy(true);
    try {
      await courseApi.approveCourse(course.id, true);
      showBanner(`Đã phê duyệt khóa học "${course.name}" thành công!`);
      if (selectedCourse?.id === course.id) setSelectedCourse(null);
      await fetchCourses();
    } catch (err: any) {
      showBanner("Lỗi khi phê duyệt khóa học", true);
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectCourseTarget || !rejectReason.trim()) return;
    setActionBusy(true);
    try {
      await courseApi.approveCourse(rejectCourseTarget.id, false, rejectReason.trim());
      showBanner(`Đã từ chối khóa học "${rejectCourseTarget.name}"`);
      setRejectDialogOpen(false);
      setRejectReason("");
      if (selectedCourse?.id === rejectCourseTarget.id) setSelectedCourse(null);
      setRejectCourseTarget(null);
      await fetchCourses();
    } catch (err: any) {
      showBanner("Lỗi khi từ chối khóa học", true);
    } finally {
      setActionBusy(false);
    }
  };

  const toggleChapter = (chapId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapId]: !prev[chapId] }));
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-extrabold uppercase">
            Chờ Duyệt
          </span>
        );
      case "ACTIVE":
        return (
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-extrabold uppercase">
            Đã Duyệt
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-extrabold uppercase">
            Từ Chối
          </span>
        );
      default:
        return null;
    }
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

      {/* Header */}
      {!selectedCourse ? (
        <div className="space-y-4 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 font-heading">
                <BookOpen className="h-6 w-6 text-primary" /> Duyệt Khóa Học
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rà soát và phê duyệt các nội dung giảng dạy do giảng viên gửi lên hệ thống.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 border-b border-border/40">
            <button
              onClick={() => setStatusTab("PENDING")}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                statusTab === "PENDING"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Chờ Duyệt</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-extrabold">
                {courses.length}
              </span>
            </button>

            <button
              onClick={() => setStatusTab("ACTIVE")}
              className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                statusTab === "ACTIVE"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đã Duyệt
            </button>

            <button
              onClick={() => setStatusTab("REJECTED")}
              className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                statusTab === "REJECTED"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Từ Chối
            </button>
          </div>
        </div>
      ) : (
        /* Back Button on Detail View */
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCourse(null)}
            className="gap-1 text-xs rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
          </Button>
          <span className="text-xs text-muted-foreground font-semibold">/ Chi tiết kiểm duyệt khóa học</span>
        </div>
      )}

      {/* MAIN VIEW: LIST OR DETAIL */}
      {!selectedCourse ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="aspect-video w-full rounded-2xl" />
          </div>
        ) : courses.length > 0 ? (
          /* Grid Card Khóa Học (3 cột) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <article
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* 16:9 Cover Image Box */}
                <div>
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {course.coverImage || course.imageUrl ? (
                      <img
                        src={course.coverImage || course.imageUrl}
                        alt={course.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-indigo-500/10">
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">{renderStatusBadge(course.status)}</div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                        {course.categoryName || course.category?.name || "Lĩnh vực"}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {course.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        <User className="h-3 w-3" />
                      </div>
                      <span className="truncate">{course.teacherName || course.authorName || "Giảng viên"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-extrabold text-foreground text-sm">
                    {Number(course.suggestedPrice || course.price || 0).toLocaleString("vi-VN")} đ
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" /> {course.createdAt?.substring(0, 10) || "Hôm nay"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Positive Empty State */
          <div className="bg-card border border-dashed border-border/80 rounded-2xl p-16 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-base">
              {statusTab === "PENDING" ? "Không có khóa học nào đang chờ duyệt 🎉" : "Chưa có dữ liệu khóa học."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {statusTab === "PENDING"
                ? "Tất cả đề xuất khóa học mới đã được phê duyệt xử lý hoàn tất."
                : "Danh sách khóa học ở trạng thái này hiện đang trống."}
            </p>
          </div>
        )
      ) : (
        /* DETAIL VIEW — CourseApprovalDetailPage */
        <div className="grid grid-cols-12 gap-6">
          {/* Main Preview (Left 8 Cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Banner */}
            <div className="relative aspect-video rounded-2xl bg-muted overflow-hidden border border-border/60">
              {selectedCourse.coverImage || selectedCourse.imageUrl ? (
                <img
                  src={selectedCourse.coverImage || selectedCourse.imageUrl}
                  alt={selectedCourse.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-indigo-500/20">
                  <BookOpen className="h-16 w-16 text-primary/40" />
                </div>
              )}
            </div>

            {/* General Info */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  {selectedCourse.categoryName || selectedCourse.category?.name || "Danh mục"}
                </span>
                {renderStatusBadge(selectedCourse.status)}
              </div>

              <h2 className="text-xl font-bold tracking-tight">{selectedCourse.name}</h2>

              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {selectedCourse.description || "Chưa có mô tả khóa học chi tiết."}
              </p>
            </div>

            {/* Chapters & Lessons Accordion */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 shadow-2xs">
              <h3 className="font-bold text-sm tracking-tight uppercase text-muted-foreground">
                Nội Dung Chương & Bài Học Dự Kiến
              </h3>

              {selectedCourse.chapters && selectedCourse.chapters.length > 0 ? (
                <div className="space-y-3">
                  {selectedCourse.chapters.map((chap: any, idx: number) => {
                    const isExpanded = !!expandedChapters[chap.id || idx];

                    return (
                      <div key={chap.id || idx} className="border border-border/60 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleChapter(String(chap.id || idx))}
                          className="w-full p-3.5 bg-muted/30 flex items-center justify-between text-xs font-bold text-left hover:bg-muted/60 transition-colors"
                        >
                          <span>Chương {idx + 1}: {chap.title || chap.name}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {isExpanded && (
                          <div className="p-3 bg-card divide-y divide-border/40 text-xs space-y-2">
                            {chap.lessons && chap.lessons.length > 0 ? (
                              chap.lessons.map((les: any, lIdx: number) => (
                                <div key={les.id || lIdx} className="pt-2 flex items-center justify-between text-muted-foreground">
                                  <span>{lIdx + 1}. {les.title || les.name}</span>
                                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
                                    {les.durationMinutes ? `${les.durationMinutes} phút` : "Bài học"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="py-2 text-center text-[11px] text-muted-foreground">
                                Danh sách bài học mẫu trong chương này.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-muted/20 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                  Khóa học bao gồm cấu trúc bài học tiêu chuẩn được chuẩn hóa.
                </div>
              )}
            </div>
          </div>

          {/* Sticky Action Panel (Right 4 Cols) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-md">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-3">
                Thông Tin Phê Duyệt
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold">Giá Đề Xuất:</span>
                  <span className="text-xl font-black text-primary">
                    {Number(selectedCourse.suggestedPrice || selectedCourse.price || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold">Giảng Viên Gửi:</span>
                  <span className="font-bold text-foreground text-sm block mt-0.5">
                    {selectedCourse.teacherName || selectedCourse.authorName || "Giảng viên hệ thống"}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block text-[11px] uppercase font-bold">Ngày Gửi Duyệt:</span>
                  <span className="font-semibold text-foreground">
                    {selectedCourse.createdAt?.substring(0, 10) || "Hôm nay"}
                  </span>
                </div>
              </div>

              {/* 2 Large Equal Buttons Side-by-Side */}
              {selectedCourse.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectCourseTarget(selectedCourse);
                      setRejectReason("");
                      setRejectDialogOpen(true);
                    }}
                    className="h-11 rounded-xl border-red-500/40 text-red-600 hover:bg-red-500/10 font-bold text-xs w-full"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Từ Chối
                  </Button>

                  <Button
                    disabled={actionBusy}
                    onClick={() => handleApprove(selectedCourse)}
                    className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs w-full shadow-sm"
                  >
                    {actionBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    Duyệt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog: RejectCourseDialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Từ Chối Duyệt Khóa Học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập chi tiết lý do từ chối để giảng viên cập nhật lại thông tin bài học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Nhập lý do từ chối (bắt buộc)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setRejectDialogOpen(false)} className="text-xs rounded-xl">
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason.trim() || actionBusy}
              onClick={handleConfirmReject}
              className="text-xs font-bold rounded-xl gap-1.5"
            >
              {actionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Xác Nhận Từ Chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CourseApprovalPage;
