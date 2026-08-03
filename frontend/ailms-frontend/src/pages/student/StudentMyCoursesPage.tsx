import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentApi, type StudentCourseCard, type StudentCourseDetail } from "@/api/student/studentApi";
import { CourseProgressRing } from "@/components/student/CourseProgressRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  Sparkles,
  Play,
  CheckCircle2,
  Lock,
  FileText,
  Video,
  FileCode,
  ArrowLeft,
  VideoIcon,
  RefreshCcw,
} from "lucide-react";

export const StudentMyCoursesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [courses, setCourses] = useState<StudentCourseCard[]>([]);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED" | "EXPIRED">("ACTIVE");
  const [courseDetail, setCourseDetail] = useState<StudentCourseDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>("les-1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getCourses().then((res) => {
      setCourses(res);
      if (id) {
        studentApi.getCourseDetail(id).then((det) => {
          setCourseDetail(det);
        });
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs font-semibold">Đang tải danh sách khóa học của bạn...</p>
      </div>
    );
  }

  // MAIN LEARNING PLAYER VIEW
  if (courseDetail) {
    const currentLesson = courseDetail.sections
      .flatMap((s) => s.lessons)
      .find((l) => l.id === activeLessonId);

    return (
      <div className="space-y-4 pb-16">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCourseDetail(null);
              navigate("/student/courses");
            }}
            className="rounded-lg gap-1.5 text-xs border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách khóa học
          </Button>
          <span className="text-xs font-bold text-primary">{courseDetail.title}</span>
        </div>

        {/* Learning Player 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Sidebar: Section -> Lesson Tree */}
          <div className="md:col-span-4 space-y-3">
            <Card className="bg-card border-border/40 p-4 space-y-3 shadow-xs max-h-[600px] overflow-y-auto">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chương trình học</h3>
              <div className="space-y-3">
                {courseDetail.sections.map((sec) => (
                  <div key={sec.id} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-foreground">{sec.title}</h4>
                    <div className="space-y-1 pl-1">
                      {sec.lessons.map((les) => (
                        <div
                          key={les.id}
                          onClick={() => {
                            if (!les.isLocked) setActiveLessonId(les.id);
                          }}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                            les.id === activeLessonId
                              ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                              : les.isLocked
                              ? "bg-muted/30 border-border/40 text-muted-foreground opacity-60 cursor-not-allowed"
                              : "bg-background border-border/40 text-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {les.isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : les.isLocked ? (
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Video className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="truncate">{les.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Area: Player & Content */}
          <div className="md:col-span-8 space-y-4">
            <Card className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-foreground">{currentLesson?.title || "Đang tải bài học..."}</h2>

              {/* Video Player Box */}
              {currentLesson?.contentType === "VIDEO" && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border/40">
                  <video src={currentLesson.videoUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              {/* Text Content Box */}
              {currentLesson?.contentType === "TEXT" && (
                <div className="p-4 bg-muted/30 border border-border/40 rounded-xl text-xs leading-relaxed text-foreground space-y-2">
                  <p>{currentLesson.textContent}</p>
                </div>
              )}

              {/* Inline Quiz / Assignment Section */}
              {currentLesson?.hasQuiz && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-primary">Bài tập Quiz đi kèm bài học này</h4>
                  <Button
                    size="sm"
                    onClick={() => navigate("/student/assignments")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Bắt đầu làm Quiz ngay
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // MAIN MY COURSES LIST VIEW
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Khóa học của tôi
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Theo dõi tiến độ học tập, vào bài học chính và gia hạn các gói học đã hết hạn.
        </p>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "ACTIVE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Đang học ({courses.filter((c) => c.status === "ACTIVE").length})
        </button>
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "COMPLETED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Đã hoàn thành ({courses.filter((c) => c.status === "COMPLETED").length})
        </button>
        <button
          onClick={() => setActiveTab("EXPIRED")}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === "EXPIRED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Đã hết hạn ({courses.filter((c) => c.status === "EXPIRED").length})
        </button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses
          .filter((c) => c.status === activeTab)
          .map((crs) => (
            <Card key={crs.id} className="bg-card border-border/40 p-5 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-primary/10 text-primary rounded border border-primary/20">
                    {crs.deliveryMode}
                  </span>
                  <h3 className="text-sm font-bold text-foreground line-clamp-2">{crs.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{crs.categoryName}</p>
                </div>
                <CourseProgressRing percent={crs.progressPercent} size={44} />
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">Hạn: {crs.expiresAt}</span>
                {crs.status === "EXPIRED" ? (
                  <Button
                    size="sm"
                    onClick={() => navigate("/student/catalog")}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg h-8 px-3 gap-1 cursor-pointer"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Gia hạn ngay
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/student/courses/${crs.id}`)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg h-8 px-3 gap-1 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-primary-foreground" />
                    Vào học
                  </Button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
};
