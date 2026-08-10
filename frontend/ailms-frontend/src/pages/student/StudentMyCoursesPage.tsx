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
  RefreshCcw,
  Users,
  UserCheck,
  Layers,
  BookOpen,
  Calendar,
} from "lucide-react";

const getCourseImage = (categoryName?: string) => {
  const images = [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80",
  ];
  if (!categoryName) return images[0];
  const charCodeSum = categoryName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return images[charCodeSum % images.length];
};

const renderDeliveryBadge = (mode?: string) => {
  switch (mode) {
    case "GROUP_CLASS":
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-blue-500/90 text-white rounded-lg backdrop-blur-sm shadow-xs flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          Lớp học nhóm
        </span>
      );
    case "ONE_ON_ONE":
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-purple-500/90 text-white rounded-lg backdrop-blur-sm shadow-xs flex items-center gap-1.5">
          <UserCheck className="h-3 w-3" />
          Kèm 1:1
        </span>
      );
    case "COMBO":
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-amber-500/90 text-white rounded-lg backdrop-blur-sm shadow-xs flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          Gói Combo
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-emerald-500/90 text-white rounded-lg backdrop-blur-sm shadow-xs flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" />
          Tự học linh hoạt
        </span>
      );
  }
};

const formatExpiryDate = (isoStr?: string) => {
  if (!isoStr) return "Không giới hạn";
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
};

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
    if (id) {
      navigate(`/learn/courses/${id}`, { replace: true });
      return;
    }
    studentApi.getCourses().then((res) => {
      setCourses(res);
      setLoading(false);
    });
  }, [id, navigate]);

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
          <span className="text-xs font-bold text-primary">{courseDetail.courseName}</span>
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
                    <h4 className="text-xs font-bold text-foreground">{sec.name}</h4>
                    <div className="space-y-1 pl-1">
                      {sec.lessons.map((les) => (
                        <div
                          key={les.id}
                          onClick={() => {
                            setActiveLessonId(les.id);
                          }}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                            les.id === activeLessonId
                              ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                              : "bg-background border-border/40 text-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {les.completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Video className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="truncate">{les.name}</span>
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
              <h2 className="text-base font-bold text-foreground">{currentLesson?.name || "Đang tải bài học..."}</h2>

              {/* Video Player Box */}
              {currentLesson?.contentType === "VIDEO" && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-border/40">
                  <video src={currentLesson.contentUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              {/* Text Content Box */}
              {currentLesson?.contentType === "TEXT" && (
                <div className="p-4 bg-muted/30 border border-border/40 rounded-xl text-xs leading-relaxed text-foreground space-y-2">
                  <p>{currentLesson.description}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const activeCoursesList = courses.filter((c) => c.status === activeTab);

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
      {activeCoursesList.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground space-y-3 bg-card rounded-2xl border border-border/40">
          <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-semibold">Chưa có khóa học nào ở trạng thái này.</p>
          <Button
            onClick={() => navigate("/student/catalog")}
            size="sm"
            className="rounded-xl text-xs font-bold"
          >
            Khám phá catalog khóa học ngay
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {activeCoursesList.map((crs) => {
            const progress = crs.progressPercent || 0;
            return (
              <div
                key={crs.id}
                onClick={() => navigate(`/learn/courses/${crs.id}`)}
                className="flex flex-col bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1.5 cursor-pointer overflow-hidden group transition-all duration-300"
              >
                {/* Cover Image Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img
                    src={crs.coverImage || getCourseImage(crs.categoryName)}
                    alt={crs.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Delivery Mode Badge (Top-left) */}
                  <div className="absolute top-3 left-3">
                    {renderDeliveryBadge(crs.deliveryMode)}
                  </div>

                  {/* Progress Ring / Percentage Pill (Top-right) */}
                  <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-extrabold text-primary shadow-sm flex items-center gap-1 font-mono">
                    <span>{progress}%</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary inline-block">
                      {crs.categoryName || "Khóa học AILMS"}
                    </span>

                    <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {crs.title}
                    </h3>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground font-medium">Tiến độ học</span>
                      <span className="font-bold font-mono text-primary">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Hạn: {formatExpiryDate(crs.expiresAt)}</span>
                    </div>

                    {crs.status === "EXPIRED" ? (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/student/catalog");
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl h-8 px-3 gap-1 cursor-pointer shadow-xs"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Gia hạn
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/learn/courses/${crs.id}`);
                        }}
                        className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl h-8 px-3.5 gap-1.5 cursor-pointer shadow-xs group-hover:translate-x-0.5 transition-transform"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        Vào học
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
