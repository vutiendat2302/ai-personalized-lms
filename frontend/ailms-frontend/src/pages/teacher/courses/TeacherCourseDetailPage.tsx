import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Star,
  FileText,
  Video,
  HelpCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Eye,
  UserRoundCheck,
  Users,
} from "lucide-react";
import type { CourseExtended } from "@/types/adminCourseClass";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const TeacherCourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const { user } = auth;

  const isTA = Boolean(
    user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "");
      return roleStr === "TA";
    }) &&
    !user?.roles?.some((r: any) => {
      const roleStr = (typeof r === "object" ? (r?.code || r?.name || "") : String(r)).toUpperCase().replace("ROLE_", "");
      return roleStr === "TEACHER" || roleStr === "ADMIN";
    })
  );

  if (isTA) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  const [course, setCourse] = useState<CourseExtended | null>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teachers, setTeachers] = useState<any[]>([]);

  const navigationState = location.state as { returnTo?: string; returnLabel?: string; catalogView?: unknown } | null;

  const handleBack = () => {
    if (navigationState?.catalogView || navigationState?.returnTo) {
      navigate(navigationState.returnTo || "/teacher/courses", {
        state: { catalogView: navigationState.catalogView },
      });
    } else {
      navigate(-1);
    }
  };

  /** Mở đúng bài học trong Learning Space và giữ đường quay lại trang chi tiết khóa học. */
  const openLessonInLearningSpace = (lessonId: string | number) => {
    if (!id) return;
    navigate(`/learn/courses/${id}/lessons/${lessonId}`, {
      state: { returnTo: `/teacher/courses/${id}` },
    });
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [row, employees, sections, teacherAssignments] = await Promise.all([
          adminCourseClassApi.getCourse(id),
          adminCourseClassApi.getEmployees(),
          adminCourseClassApi.getSections(id),
          adminCourseClassApi.getCourseTeachers(id),
        ]);

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
            name: employee?.fullName || employee?.username || `Giảng viên #${assignment.userId}`,
            avatar: employee?.avatarUrl && employee.avatarUrl.trim() !== "" ? employee.avatarUrl : undefined,
            category: isPrimary ? "Giảng viên chính" : "Đồng phụ trách",
            isPrimary,
            status,
          };
        });
        setTeachers(assignedTeachers);

        const lessons = await Promise.all(sections.map((section: any) => adminCourseClassApi.getLessons(section.id)));
        setCurriculum(sections.map((section: any, index: number) => ({ ...section, lessons: lessons[index] || [] })));

        setCourse({
          ...row,
          id: String(row.id),
          categoryId: String(row.categoryId),
          status: row.status as import("@/types/adminCourseClass").CourseStatus,
          level: row.level === "BEGINNER" ? "BASIC" : row.level,
          teachers: assignedTeachers,
          rating: Number(row.avgRating || 0),
          reviewCount: row.reviewCount || 0,
          referencePrice: Number(row.suggestedPrice || 0),
          packages: [],
          packagesCount: 0,
        } as import("@/types/adminCourseClass").CourseExtended);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Không thể tải chi tiết khóa học");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) return <div className="py-20 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải khóa học...</div>;
  if (error || !course) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-2"><AlertTriangle className="h-5 w-5" /> {error || "Không tìm thấy khóa học"}</div>;

  return (
    <div className="space-y-6">
      {/* Back Button & Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="h-9 px-3 text-slate-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại danh sách khóa học
        </Button>
        <span className="text-slate-300">|</span>
        <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <button type="button" onClick={handleBack} className="font-semibold hover:text-blue-600">Quản lý khóa học</button>
          <span>/</span>
          <span className="text-slate-700 font-medium">Chi tiết khóa học</span>
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

          {/* Assigned Teachers Panel */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 md:w-72 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Giảng viên phụ trách
            </span>
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

      {/* Curriculum Content Section (Read & Build Studio for Teacher) */}
      <div className="space-y-4">
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
            onClick={() => navigate(`/teacher/courses/${course.id}/builder`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-4 py-2 cursor-pointer shadow-xs"
          >
            Mở Studio Soạn Thảo
          </Button>
        </div>

        {/* Curriculum Chapters List */}
        <div className="space-y-3">
          {curriculum.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">
              Khóa học chưa có chương hoặc bài học.
            </div>
          )}
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
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {les.durationMin ? `${les.durationMin} phút` : "Chưa cập nhật"}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                          <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
};
