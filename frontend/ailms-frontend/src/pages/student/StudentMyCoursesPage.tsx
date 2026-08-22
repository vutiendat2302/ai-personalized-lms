import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Calendar, Play, RefreshCcw, Sparkles, UserCheck, Users } from "lucide-react";
import { studentApi, type StudentCourseCard } from "@/api/student/studentApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCompletionActions } from "@/components/student/CourseCompletionActions";

type CourseTab = "ACTIVE" | "COMPLETED" | "EXPIRED";

/** Hiển thị khóa học đã ghi danh cùng tiến độ do backend tính. */
export const StudentMyCoursesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<StudentCourseCard[]>([]);
  const [activeTab, setActiveTab] = useState<CourseTab>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** Chuyển route chi tiết cũ sang không gian học tập và tải danh sách từ API. */
  useEffect(() => {
    if (id) {
      void navigate(`/learn/courses/${id}`, { replace: true });
      return;
    }
    studentApi.getCourses().then(setCourses)
      .catch(() => { setError("Không thể tải khóa học của bạn."); })
      .finally(() => { setLoading(false); });
  }, [id, navigate]);

  const visibleCourses = useMemo(() => courses.filter((course) => course.status === activeTab)
    .sort((left, right) => new Date(right.lastAccessedAt).getTime() - new Date(left.lastAccessedAt).getTime()),
  [activeTab, courses]);

  /** Định dạng thời hạn quyền học. */
  const formatExpiryDate = (value?: string) => value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value))
    : "Không giới hạn";

  /** Trả nhãn và icon cho hình thức gói học. */
  const deliveryMeta = (mode: StudentCourseCard["deliveryMode"]) => {
    if (mode === "GROUP_CLASS") return { label: "Lớp học nhóm", icon: Users };
    if (mode === "ONE_ON_ONE") return { label: "Kèm riêng 1-1", icon: UserCheck };
    return { label: "Tự học", icon: BookOpen };
  };

  /** Đồng bộ review hoặc chứng chỉ vừa tạo vào đúng thẻ khóa học. */
  const updateCourse = (courseId: string, changes: Partial<StudentCourseCard>) => {
    setCourses((current) => current.map((course) => course.id === courseId ? { ...course, ...changes } : course));
  };

  if (loading) return <div className="space-y-6" aria-label="Đang tải khóa học của bạn"><Skeleton className="h-16 w-full" /><Skeleton className="h-10 w-80 max-w-full" /><div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-80" />)}</div></div>;
  if (error) return <Card className="p-10 text-center text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Sparkles className="h-6 w-6 text-primary" /> Khóa học của tôi
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Tiến độ được backend tính từ bài học, bài tập và quiz đã hoàn thành của bạn.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as CourseTab); }}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Đang học ({courses.filter((item) => item.status === "ACTIVE").length})</TabsTrigger>
          <TabsTrigger value="COMPLETED">Hoàn thành ({courses.filter((item) => item.status === "COMPLETED").length})</TabsTrigger>
          <TabsTrigger value="EXPIRED">Hết hạn ({courses.filter((item) => item.status === "EXPIRED").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visibleCourses.length === 0 ? (
        <Card className="border-dashed p-14 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h2 className="font-bold text-foreground">Không có khóa học ở trạng thái này</h2>
          <p className="mt-1 text-sm text-muted-foreground">Các khóa học bạn sở hữu sẽ được hiển thị theo trạng thái quyền học.</p>
          <Button className="mt-4" size="sm" onClick={() => { void navigate("/student/catalog"); }}>Khám phá khóa học</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => {
            const progress = Math.min(100, Math.max(0, course.progressPercent));
            const meta = deliveryMeta(course.deliveryMode);
            const ModeIcon = meta.icon;
            return (
              <Card key={course.id} className="group overflow-hidden border-border/60 p-0 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <button type="button" onClick={() => { void navigate(`/learn/courses/${course.id}`); }} className="block w-full text-left">
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt={course.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/8"><BookOpen className="h-12 w-12 text-primary/40" /></div>
                    )}
                    <Badge className="absolute left-3 top-3 gap-1.5"><ModeIcon className="h-3 w-3" />{meta.label}</Badge>
                    <div className="absolute right-3 top-3 rounded-lg bg-background/90 px-2.5 py-1 text-xs font-black text-primary shadow">{progress}%</div>
                  </div>
                </button>

                <div className="space-y-4 p-5">
                  <div>
                    {course.categoryName && <p className="text-[10px] font-black uppercase tracking-wider text-primary">{course.categoryName}</p>}
                    <h2 className="mt-1 line-clamp-2 min-h-10 font-bold leading-5 text-foreground">{course.title}</h2>
                    {course.teacherName && <p className="mt-1 text-xs text-muted-foreground">Giảng viên: {course.teacherName}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Tiến độ học</span><strong>{progress}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${String(progress)}%` }} /></div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Calendar className="h-3.5 w-3.5" />{formatExpiryDate(course.expiresAt)}</span>
                    {course.status === "EXPIRED" ? (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { void navigate(`/courses/${course.id}`); }}><RefreshCcw className="h-3.5 w-3.5" />Mua thêm gói</Button>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={() => { void navigate(`/learn/courses/${course.id}`); }}><Play className="h-3.5 w-3.5" />Vào học</Button>
                    )}
                  </div>
                  {course.status === "COMPLETED" && (
                    <CourseCompletionActions course={course} onCourseUpdated={updateCourse} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
