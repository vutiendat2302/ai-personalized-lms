import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Package,
  Star,
  FileText,
  Video,
  HelpCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Eye,
  ExternalLink,
  Paperclip,
  UserRoundCheck,
  UserPlus,
  Trash2,
  Users,
  Search,
  RefreshCw,
} from "lucide-react";
import type { CourseExtended } from "@/types/adminCourseClass";
import { CoursePackageTab } from "./CoursePackageTab";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const CourseAdminDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [course, setCourse] = useState<CourseExtended | null>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [lessonResources, setLessonResources] = useState<any[]>([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("packages");

  // Teacher management state
  const [teachers, setTeachers] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherActionLoading, setTeacherActionLoading] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const navigationState = location.state as { returnTo?: string; returnLabel?: string; studentId?: string; approvalView?: unknown; catalogView?: unknown } | null;

  const handleBack = () => {
    if (navigationState?.catalogView || navigationState?.returnTo) {
      navigate(navigationState.returnTo || "/admin/courses", {
        state: { catalogView: navigationState.catalogView },
      });
    } else if (navigationState?.approvalView) {
      navigate("/admin/courses/approvals", { state: { approvalView: navigationState.approvalView } });
    } else if (navigationState?.studentId) {
      navigate(`/admin/students/${navigationState.studentId}`);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [row, packages, employees, sections, teacherAssignments] = await Promise.all([
          adminCourseClassApi.getCourse(id), adminCourseClassApi.getPackagesByCourse(id),
          adminCourseClassApi.getEmployees(), adminCourseClassApi.getSections(id),
          adminCourseClassApi.getCourseTeachers(id),
        ]);
        setAllEmployees(employees);
        const employeeById = new Map<string, any>();
        (employees || []).forEach((item: any) => {
          if (item.id != null) employeeById.set(String(item.id), item);
          if (item.userId != null) employeeById.set(String(item.userId), item);
        });

        const assignedTeachers = teacherAssignments.map((assignment: any, index: number) => {
          const employee: any = employeeById.get(String(assignment.userId));
          const isPrimary = index === 0;
          const status = assignment.status || "ACTIVE";
          return {
            id: String(assignment.userId),
            name: employee?.fullName || employee?.username || "Chưa xác định",
            avatar: employee?.avatarUrl && employee.avatarUrl.trim() !== "" ? employee.avatarUrl : undefined,
            category: isPrimary ? "Giảng viên chính" : "Đồng phụ trách",
            isPrimary,
            status,
          };
        });
        setTeachers(assignedTeachers);
        const lessons = await Promise.all(sections.map((section: any) => adminCourseClassApi.getLessons(section.id)));
        setCurriculum(sections.map((section: any, index: number) => ({ ...section, lessons: lessons[index] || [] })));
        setCourse({ ...row, id: String(row.id), categoryId: String(row.categoryId),
          status: row.status as import("@/types/adminCourseClass").CourseStatus,
          level: row.level as import("@/types/adminCourseClass").CourseLevel,
          teachers: assignedTeachers,
          rating: Number(row.avgRating || 0), reviewCount: row.reviewCount || 0, referencePrice: Number(row.suggestedPrice || 0),
          packages: packages.map((item: any) => ({ ...item, id: String(item.id), courseId: String(item.courseId), active: item.status === "ACTIVE", attachedClassId: item.classId ? String(item.classId) : undefined, attachedClassName: item.className })), packagesCount: packages.length,
        } as import("@/types/adminCourseClass").CourseExtended);
      } catch (err: any) { setError(err?.response?.data?.message || "Không thể tải chi tiết khóa học"); }
      finally { setLoading(false); }
    };
    void load();
  }, [id]);

  // Filter employees not yet assigned as teachers
  const assignedIds = useMemo(() => new Set(teachers.map((t) => t.id)), [teachers]);
  const candidateEmployees = useMemo(() => {
    const q = teacherSearch.toLowerCase().trim();
    return allEmployees.filter((emp: any) => {
      const uid = String(emp.id || emp.userId);
      if (assignedIds.has(uid)) return false;
      if (!q) return true;
      const name = (emp.fullName || emp.username || "").toLowerCase();
      const email = (emp.userEmail || emp.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allEmployees, assignedIds, teacherSearch]);

  const handleInviteTeacher = async (employee: any, asPrimary = false) => {
    if (!course) return;
    const uid = String(employee.id || employee.userId);
    setTeacherActionLoading(uid);
    setTeacherError("");
    try {
      await adminCourseClassApi.assignCourseTeacher(course.id, uid);
      const newTeacher = {
        id: uid,
        name: employee.fullName || employee.username || "Chưa xác định",
        avatar: employee.avatarUrl && employee.avatarUrl.trim() !== "" ? employee.avatarUrl : undefined,
        category: asPrimary || teachers.length === 0 ? "Giảng viên chính" : "Đồng phụ trách",
        isPrimary: asPrimary || teachers.length === 0,
        status: "PENDING", // Newly invited -> Pending confirmation
      };
      setTeachers((prev) => {
        if (asPrimary || prev.length === 0) {
          const demoted = prev.map((t) => ({ ...t, category: "Đồng phụ trách", isPrimary: false }));
          return [newTeacher, ...demoted];
        }
        return [...prev, newTeacher];
      });
    } catch (err: any) {
      setTeacherError(err?.response?.data?.message || "Không thể gửi lời mời giảng viên");
    } finally {
      setTeacherActionLoading("");
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!course) return;
    setTeacherActionLoading(teacherId);
    setTeacherError("");
    try {
      await adminCourseClassApi.removeCourseTeacher(course.id, teacherId);
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
    } catch (err: any) { setTeacherError(err?.response?.data?.message || "Không thể xóa giảng viên"); }
    finally { setTeacherActionLoading(""); }
  };

  const openLessonDetail = async (lesson: any) => {
    setSelectedLesson(lesson); setLessonResources([]); setLessonError(""); setLessonLoading(true);
    try {
      const [detail, resources] = await Promise.all([
        adminCourseClassApi.getLesson(lesson.id), adminCourseClassApi.getLessonResources(lesson.id),
      ]);
      setSelectedLesson(detail); setLessonResources(resources);
    } catch (err: any) { setLessonError(err?.response?.data?.message || "Không thể tải chi tiết bài học"); }
    finally { setLessonLoading(false); }
  };

  /** Mở đúng bài học trong Learning Space ở chế độ preview của quản trị viên. */
  const openLessonInLearningSpace = (lessonId: string | number) => {
    if (!id || lessonId == null) return;
    navigate(`/learn/courses/${id}/lessons/${lessonId}`, {
      state: { returnTo: `/admin/courses/${id}` },
    });
  };

  if (loading) return <div className="py-20 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải khóa học...</div>;
  if (error || !course) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-2"><AlertTriangle className="h-5 w-5" /> {error || "Không tìm thấy khóa học"}</div>;

  return (
    <div className="space-y-6">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="h-9 px-3 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại {navigationState?.returnLabel || (navigationState?.studentId ? "học viên" : "danh sách khóa học")}
        </Button>
        <span className="text-slate-300">|</span>
        <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <button type="button" onClick={handleBack} className="font-semibold hover:text-blue-600">{navigationState?.returnLabel || (navigationState?.studentId ? "Học viên" : "Quản lý khóa học")}</button>
          <span>/</span>
          <span className="text-slate-700">Chi tiết khóa học</span>
        </div>
        <span className="hidden text-slate-300 md:inline">|</span>
        <span className="text-xs text-slate-500 font-medium">
          Mã khóa: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{course.id}</code>
        </span>
      </div>

      {/* Course Detail Banner Header */}
      <Card className="border-slate-200 shadow-none bg-linear-to-r from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                {course.categoryName}
              </Badge>
              {(() => {
                const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
                  ACTIVE:   { label: "Đang hoạt động", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" },
                  PENDING:  { label: "Chờ duyệt", cls: "bg-amber-500/20 text-amber-300 border-amber-400/30" },
                  DRAFT:    { label: "Nháp", cls: "bg-blue-500/20 text-blue-300 border-blue-400/30" },
                  REJECTED: { label: "Từ chối", cls: "bg-red-500/20 text-red-300 border-red-400/30" },
                  INACTIVE: { label: "Đã ẩn / Lưu trữ", cls: "bg-slate-500/20 text-slate-300 border-slate-400/30" },
                  DELETED:  { label: "Đã xóa", cls: "bg-zinc-500/20 text-zinc-400 border-zinc-400/30" },
                };
                const cfg = STATUS_CONFIG[course.status] ?? { label: course.status, cls: "bg-slate-500/20 text-slate-300 border-slate-400/30" };
                return <Badge className={cfg.cls}>{cfg.label}</Badge>;
              })()}
              <Badge variant="outline" className="text-slate-300 border-slate-700">
                Cấp độ: {course.level}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {course.name}
            </h1>
            <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">
              {course.description}
            </p>

            <div className="flex items-center gap-6 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{course.rating > 0 ? course.rating.toFixed(1) : "Chưa có đánh giá"}</span>
                <span className="text-slate-400 font-normal">({course.reviewCount} reviews)</span>
              </div>
              <div>
                <span>Giá tham chiếu: </span>
                <span className="font-bold text-white">
                  {course.referencePrice.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Management Panel */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 md:w-72 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Giảng viên phụ trách
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setTeacherSearch(""); setTeacherError(""); setTeacherDialogOpen(true); }}
                className="h-7 px-2.5 text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" /> Quản lý
              </Button>
            </div>
            <div className="space-y-2">
              {teachers.length === 0 && (
                <p className="text-xs text-amber-300 italic">Chưa có giảng viên nào được phân công.</p>
              )}
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-200 flex items-center justify-center shrink-0">
                      <UserRoundCheck className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-xs min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-white truncate">{t.name}</p>
                      {t.status === "PENDING" && (
                        <span className="text-[10px] text-amber-300 font-bold bg-amber-400/20 px-1 py-0.5 rounded">
                          ⏳ Chờ xác nhận
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400">{t.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger
            value="packages"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold px-5 text-sm"
          >
            <Package className="w-4 h-4 mr-2 text-blue-600" /> Gói Bán Khóa Học ({course.packages.length})
          </TabsTrigger>
          <TabsTrigger
            value="curriculum"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold px-5 text-sm"
          >
            <BookOpen className="w-4 h-4 mr-2 text-indigo-600" /> Nội Dung Chương/Bài Học
          </TabsTrigger>
        </TabsList>

        {/* Tab 2: Gói Bán */}
        <TabsContent value="packages">
          <CoursePackageTab
            courseId={course.id}
            courseName={course.name}
            courseStatus={course.status}
            packages={course.packages}
          />
        </TabsContent>

        {/* Tab 1: Nội dung (Read-only for Admin) */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">
                  Nội dung Đào tạo (Course Builder Studio)
                </p>
                <p className="text-slate-500">
                  Quản lý chương học, bài học video, bài tập tự luận và các bài trắc nghiệm 3 cấp.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/admin/courses/${course.id}/builder`)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-4 py-2 cursor-pointer shadow-xs"
            >
              Mở Studio Soạn Thảo
            </Button>
          </div>

          {/* Curriculum Chapters List */}
          <div className="space-y-3">
            {curriculum.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">Khóa học chưa có chương hoặc bài học.</div>}
            {curriculum.map((chap, idx) => (
              <Card key={chap.id || idx} className="border-slate-200 shadow-none">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {chap.title || chap.name || `Chương ${idx + 1}`}
                    </h3>
                    <Badge variant="outline" className="text-xs text-slate-500">
                      {chap.lessons.length} bài học
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {chap.lessons.map((les: any, lIdx: number) => (
                      <button
                        type="button"
                        key={lIdx}
                        onClick={() => openLessonInLearningSpace(les.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 hover:bg-blue-50 hover:text-blue-700 text-xs text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 font-medium text-slate-800">
                          {(les.type === "VIDEO" || les.lessonType === "VIDEO") && <Video className="w-4 h-4 text-blue-500" />}
                          {(les.type === "QUIZ" || les.lessonType === "QUIZ") && <HelpCircle className="w-4 h-4 text-amber-500" />}
                          {(les.type === "ASSIGNMENT" || les.lessonType === "ASSIGNMENT") && <FileText className="w-4 h-4 text-emerald-500" />}
                          <span>{les.title || les.name}</span>
                        </div>
                        <span className="text-slate-500 font-normal flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {les.durationMin ? `${les.durationMin} phút` : "Chưa cập nhật"}</span>
                          <span className="flex items-center gap-1 text-blue-600 font-semibold"><Eye className="w-3.5 h-3.5" /> Xem chi tiết</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedLesson && (
        <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-start gap-3 pr-7">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <DialogTitle className="text-lg leading-snug">{selectedLesson.name || selectedLesson.title || "Chi tiết bài học"}</DialogTitle>
                  <DialogDescription className="mt-1">Chế độ xem đầy đủ dành cho quản trị viên · Không chỉnh sửa nội dung.</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {lessonLoading ? (
              <div className="py-16 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải bài học...</div>
            ) : lessonError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /> {lessonError}</div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">{selectedLesson.contentType || selectedLesson.type || "Chưa phân loại"}</Badge>
                  <Badge variant="outline">{selectedLesson.status || "Chưa có trạng thái"}</Badge>
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {selectedLesson.durationMin ? `${selectedLesson.durationMin} phút` : "Chưa cập nhật thời lượng"}</Badge>
                </div>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung/Mô tả bài học</h3>
                  <div className="rounded-xl border bg-slate-50/60 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-6 min-h-24">
                    {selectedLesson.description || "Bài học chưa có nội dung mô tả."}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung chính</h3>
                  {selectedLesson.contentUrl ? (
                    <a href={selectedLesson.contentUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                      <span className="truncate pr-3">{selectedLesson.contentUrl}</span><ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  ) : <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">Bài học chưa có URL nội dung.</div>}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> Tài nguyên đính kèm ({lessonResources.length})</h3>
                  {lessonResources.length ? lessonResources.map((resource) => (
                    <a key={resource.id} href={resource.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-3 hover:bg-slate-50">
                      <div className="min-w-0"><p className="text-sm font-semibold truncate">{resource.name || "Tài nguyên bài học"}</p><p className="text-[11px] text-slate-500">{resource.fileType || "Không rõ định dạng"}{resource.fileSize ? ` · ${(resource.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}</p></div>
                      <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
                    </a>
                  )) : <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">Bài học không có tài nguyên đính kèm.</div>}
                </section>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3"><span className="text-slate-500">Ngày tạo</span><p className="font-semibold mt-1">{selectedLesson.createdAt ? new Date(selectedLesson.createdAt).toLocaleString("vi-VN") : "Chưa cập nhật"}</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><span className="text-slate-500">Cập nhật lần cuối</span><p className="font-semibold mt-1">{selectedLesson.updatedAt ? new Date(selectedLesson.updatedAt).toLocaleString("vi-VN") : "Chưa cập nhật"}</p></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Teacher Invitation Dialog ─── */}
      <Dialog open={teacherDialogOpen} onOpenChange={(o) => { if (!teacherActionLoading) setTeacherDialogOpen(o); }}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Mời Giảng viên Phụ trách Khóa học
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gửi lời mời phân công phụ trách chính hoặc đồng biên soạn nội dung cho khóa học <span className="font-semibold text-slate-800">{course?.name}</span>
            </DialogDescription>
          </DialogHeader>

          {teacherError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {teacherError}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">
            {/* Confirmed Teachers */}
            {teachers.filter((t) => t.status === "ACTIVE" || t.status === "ACCEPTED").length > 0 && (
              <section className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Giảng viên chính thức ({teachers.filter((t) => t.status === "ACTIVE" || t.status === "ACCEPTED").length})
                </h4>
                <div className="space-y-2">
                  {teachers.filter((t) => t.status === "ACTIVE" || t.status === "ACCEPTED").map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white transition-colors">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          {(t.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                          {idx === 0 ? (
                            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] font-bold">
                              ★ Giảng viên chính
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
                              Đồng phụ trách
                            </Badge>
                          )}
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-semibold">
                            ✓ Đã xác nhận
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">Mã giảng viên: #{t.id}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={teacherActionLoading === t.id}
                        onClick={() => handleRemoveTeacher(t.id)}
                        className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 cursor-pointer gap-1"
                        title="Xóa khỏi khóa học"
                      >
                        {teacherActionLoading === t.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Xóa</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Pending Invitations */}
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Lời mời đã gửi · Chờ duyệt ({teachers.filter((t) => t.status === "PENDING").length})
              </h4>
              {teachers.filter((t) => t.status === "PENDING").length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-xs text-slate-500 font-medium">
                  Không có lời mời nào đang chờ duyệt.
                </div>
              ) : (
                <div className="space-y-2">
                  {teachers.filter((t) => t.status === "PENDING").map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                      {t.avatar ? (
                        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-amber-200 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          {(t.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                          <Badge className="bg-amber-500/15 text-amber-800 border-amber-400/30 text-[10px] font-bold">
                            ⏳ Chờ GV xác nhận
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {t.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-amber-700 font-medium">Đã gửi thông báo hệ thống · Chờ phản hồi</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={teacherActionLoading === t.id}
                        onClick={() => handleRemoveTeacher(t.id)}
                        className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-100/70 rounded-lg shrink-0 cursor-pointer gap-1"
                        title="Thu hồi lời mời"
                      >
                        {teacherActionLoading === t.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Thu hồi</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Invite candidate teacher */}
            <section className="space-y-2.5 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                Mời giảng viên mới
              </h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Tìm giảng viên theo tên hoặc email..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-xl"
                />
              </div>
              {candidateEmployees.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-1 py-3 text-center">
                  {teacherSearch ? "Không tìm thấy giảng viên/nhân viên phù hợp." : "Tất cả nhân viên đã được phân công hoặc đang có lời mời."}
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {candidateEmployees.slice(0, 30).map((emp: any) => {
                    const uid = String(emp.id || emp.userId);
                    return (
                      <div key={uid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-xs font-bold">
                              {(emp.fullName || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{emp.fullName || emp.username}</p>
                            <p className="text-[11px] text-slate-400 truncate">{emp.userEmail || emp.email || "Chưa có email"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <Button
                            size="sm"
                            disabled={teacherActionLoading === uid}
                            onClick={() => handleInviteTeacher(emp, true)}
                            className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg gap-1 cursor-pointer"
                            title="Gửi lời mời đảm nhận vị trí Giảng viên chính"
                          >
                            {teacherActionLoading === uid ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Star className="h-3 w-3 fill-white" />
                            )}
                            <span>Mời làm GV chính</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={teacherActionLoading === uid}
                            onClick={() => handleInviteTeacher(emp, false)}
                            className="h-7 px-2.5 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold rounded-lg gap-1 cursor-pointer"
                            title="Gửi lời mời làm Giảng viên đồng phụ trách"
                          >
                            {teacherActionLoading === uid ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3" />
                            )}
                            <span>Mời Đồng phụ trách</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="border-t pt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setTeacherDialogOpen(false)} className="rounded-xl font-semibold cursor-pointer">
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
