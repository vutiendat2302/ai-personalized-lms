import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Package,
  Star,
  Lock,
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
} from "lucide-react";
import type { CourseExtended } from "@/types/adminCourseClass";
import { CoursePackageTab } from "./CoursePackageTab";
import { adminCourseClassApi } from "@/api/courses/adminCourseClassApi";

export const CourseAdminDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseExtended | null>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [lessonResources, setLessonResources] = useState<any[]>([]);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("packages");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [row, packages, employees, sections, teacherAssignments] = await Promise.all([
          adminCourseClassApi.getCourse(id), adminCourseClassApi.getPackagesByCourse(id),
          adminCourseClassApi.getEmployees(), adminCourseClassApi.getSections(id),
          adminCourseClassApi.getCourseTeachers(id),
        ]);
        const employeeById = new Map(employees.map((employee: any) => [String(employee.id || employee.userId), employee]));
        const assignedTeachers = teacherAssignments.map((assignment: any) => {
          const employee: any = employeeById.get(String(assignment.userId));
          return {
            id: String(assignment.userId),
            name: employee?.fullName || employee?.username || `Giảng viên #${assignment.userId}`,
            avatar: employee?.avatarUrl || "",
            category: String(assignment.userId) === String(row.createdBy) ? "Tác giả khóa học" : "Đồng phụ trách",
          };
        });
        const lessons = await Promise.all(sections.map((section: any) => adminCourseClassApi.getLessons(section.id)));
        setCurriculum(sections.map((section: any, index: number) => ({ ...section, lessons: lessons[index] || [] })));
        setCourse({ ...row, id: String(row.id), categoryId: String(row.categoryId),
          status: row.status === "PENDING" ? "PENDING_APPROVAL" : row.status,
          level: row.level === "BEGINNER" ? "BASIC" : row.level,
          teachers: assignedTeachers,
          rating: Number(row.avgRating || 0), reviewCount: row.reviewCount || 0, referencePrice: Number(row.suggestedPrice || 0),
          packages: packages.map((item: any) => ({ ...item, id: String(item.id), courseId: String(item.courseId), active: item.status === "ACTIVE", attachedClassId: item.classId ? String(item.classId) : undefined, attachedClassName: item.className })), packagesCount: packages.length,
        } as CourseExtended);
      } catch (err: any) { setError(err?.response?.data?.message || "Không thể tải chi tiết khóa học"); }
      finally { setLoading(false); }
    };
    void load();
  }, [id]);

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

  if (loading) return <div className="py-20 flex justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải khóa học...</div>;
  if (error || !course) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-2"><AlertTriangle className="h-5 w-5" /> {error || "Không tìm thấy khóa học"}</div>;

  return (
    <div className="space-y-6">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/courses")}
          className="h-9 px-3 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại danh sách
        </Button>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-500 font-medium">
          Mã khóa: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{course.id}</code>
        </span>
      </div>

      {/* Course Detail Banner Header */}
      <Card className="border-slate-200 shadow-none bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                {course.categoryName}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                {course.status}
              </Badge>
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

          {/* Teacher avatars */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 md:w-64 space-y-2">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
              Giảng viên phụ trách
            </span>
            <div className="space-y-2">
              {course.teachers.length === 0 && <p className="text-xs text-amber-300">Chưa có phân công trong course_teacher</p>}
              {course.teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  {t.avatar ? <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover border border-slate-600" /> : <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-200 flex items-center justify-center"><UserRoundCheck className="w-4 h-4" /></div>}
                  <div className="text-xs">
                    <p className="font-semibold text-white">{t.name}</p>
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
            packages={course.packages}
          />
        </TabsContent>

        {/* Tab 1: Nội dung (Read-only for Admin) */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-800">
                  Chế độ xem Nội dung Đào tạo (Read-Only)
                </p>
                <p className="text-slate-500">
                  Nội dung chi tiết chương, bài học và bài tập do Giảng viên phụ trách biên soạn và quản lý.
                </p>
              </div>
            </div>
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
                        onClick={() => void openLessonDetail(les)}
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
    </div>
  );
};
