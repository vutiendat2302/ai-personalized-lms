import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  studentApi,
  type StudentDashboardMetrics,
  type StudentCourseCard,
  type CatalogCourseItem,
  type StudentPersonalization,
  type StudyGoalItem,
  type StudentProgressAnalytics,
} from "@/api/student/studentApi";
import { courseApi } from "@/api/courses/courseApi";
import type { CategoryResponse } from "@/types/admin";
import { useAuth } from "@/hooks/useAuth";
import { formatCourseLevel } from "@/utils/searchUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Star,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CourseScrollContainer } from "@/components/courses/CourseScrollContainer";

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { user } = auth;

  const [metrics, setMetrics] = useState<StudentDashboardMetrics | null>(null);
  const [myCourses, setMyCourses] = useState<StudentCourseCard[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<CatalogCourseItem[]>([]);
  const [personalization, setPersonalization] = useState<StudentPersonalization | null>(null);
  const [goals, setGoals] = useState<StudyGoalItem[]>([]);
  const [progressAnalytics, setProgressAnalytics] = useState<StudentProgressAnalytics | null>(null);
  const [nextLessonTitle, setNextLessonTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Category states from Landing page
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [catPage, setCatPage] = useState(0);
  const [hasMoreCats, setHasMoreCats] = useState(true);
  const [isExpandedCats, setIsExpandedCats] = useState(false);

  // Featured course states from Landing page
  const [outstandingCourses, setOutstandingCourses] = useState<any[]>([]);
  const [trendingCourses, setTrendingCourses] = useState<any[]>([]);
  const [latestCourses, setLatestCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [popularPage, setPopularPage] = useState(0);
  const [trendingPage, setTrendingPage] = useState(0);
  const [newPage, setNewPage] = useState(0);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreNew, setHasMoreNew] = useState(true);

  const isLoadingCoursesRef = useRef(false);

  const fetchCategories = async (page: number) => {
    try {
      setLoadingCats(true);
      const res = await courseApi.searchCategories({ page, size: 8, status: "ACTIVE" });
      if (res.data.success) {
        const pageData = res.data.data;
        const newCats = pageData.content || [];
        setCategories((prev) => (page === 0 ? newCats : [...prev, ...newCats]));
        setHasMoreCats(!pageData.last);
      }
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    } finally {
      setLoadingCats(false);
    }
  };

  const fetchFeaturedCourses = async () => {
    try {
      setLoadingCourses(true);
      const [outstandingRes, trendingRes, latestRes] = await Promise.all([
        courseApi.getOutstandingCourses({ page: 0, size: 6 }),
        courseApi.getTrendingCourses({ page: 0, size: 6 }),
        courseApi.getLatestCourses({ page: 0, size: 6 }),
      ]);

      if (outstandingRes.data.success) {
        const pageData = outstandingRes.data.data;
        setOutstandingCourses(pageData.content || []);
        setHasMorePopular(!pageData.last);
      }
      if (trendingRes.data.success) {
        const pageData = trendingRes.data.data;
        setTrendingCourses(pageData.content || []);
        setHasMoreTrending(!pageData.last);
      }
      if (latestRes.data.success) {
        const pageData = latestRes.data.data;
        setLatestCourses(pageData.content || []);
        setHasMoreNew(!pageData.last);
      }
    } catch (e) {
      console.error("Failed to fetch featured courses:", e);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadMoreCourses = async (tabVal: "popular" | "trending" | "new") => {
    if (isLoadingCoursesRef.current || loadingCourses) return;
    try {
      isLoadingCoursesRef.current = true;
      if (tabVal === "popular") {
        const nextPage = popularPage + 1;
        const res = await courseApi.getOutstandingCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data;
          setOutstandingCourses((prev) => [...prev, ...(pageData.content || [])]);
          setPopularPage(nextPage);
          setHasMorePopular(!pageData.last);
        }
      } else if (tabVal === "trending") {
        const nextPage = trendingPage + 1;
        const res = await courseApi.getTrendingCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data;
          setTrendingCourses((prev) => [...prev, ...(pageData.content || [])]);
          setTrendingPage(nextPage);
          setHasMoreTrending(!pageData.last);
        }
      } else if (tabVal === "new") {
        const nextPage = newPage + 1;
        const res = await courseApi.getLatestCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data;
          setLatestCourses((prev) => [...prev, ...(pageData.content || [])]);
          setNewPage(nextPage);
          setHasMoreNew(!pageData.last);
        }
      }
    } catch (e) {
      console.error(`Failed to load more ${tabVal} courses:`, e);
    } finally {
      isLoadingCoursesRef.current = false;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, tabVal: "popular" | "trending" | "new") => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    if (scrollLeft + clientWidth >= scrollWidth - 50) {
      const hasMore =
        tabVal === "popular" ? hasMorePopular :
        tabVal === "trending" ? hasMoreTrending :
        hasMoreNew;

      if (hasMore) {
        void loadMoreCourses(tabVal);
      }
    }
  };

  /** Chuyển đổi mở rộng / thu gọn các chủ đề học tập nổi bật. */
  const handleToggleExpandCats = async () => {
    if (!isExpandedCats && hasMoreCats) {
      const nextPage = catPage + 1;
      setCatPage(nextPage);
      await fetchCategories(nextPage);
    }
    setIsExpandedCats((prev) => !prev);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [metricsData, coursesData, catalogData, personalizationData, goalsData, progressData] = await Promise.all([
          studentApi.getDashboardMetrics().catch(() => null),
          studentApi.getCourses().catch(() => []),
          studentApi.getCatalog({ page: 0, size: 6 }).catch(() => null),
          studentApi.getPersonalization().catch(() => null),
          studentApi.getGoals().catch(() => []),
          studentApi.getProgressAnalytics().catch(() => null),
        ]);

        if (metricsData) {
          setMetrics(metricsData);
        }

        setMyCourses(coursesData || []);
        setPersonalization(personalizationData);
        setGoals(goalsData);
        setProgressAnalytics(progressData);

        const recentCourse = [...(coursesData || [])].filter((course) => course.status === "ACTIVE")
          .sort((left, right) => new Date(right.lastAccessedAt || 0).getTime() - new Date(left.lastAccessedAt || 0).getTime())[0];
        if (recentCourse) {
          const detail = await studentApi.getCourseDetail(recentCourse.id).catch(() => null);
          const nextLesson = detail?.sections.flatMap((section) => section.lessons).find((lesson) => !lesson.completed);
          setNextLessonTitle(nextLesson?.name || null);
        }

        // Filter personalized / recommended courses from catalog
        setRecommendedCourses((catalogData?.content || []).filter((course) => course.personalized));

        // Fetch categories & featured courses using exact Landing page logic
        await Promise.all([
          fetchCategories(0),
          fetchFeaturedCourses(),
        ]);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu dashboard:", err);
        setLoadError("Không thể tải bảng học tập của bạn.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm font-semibold">Đang tải trang tổng quan học tập của bạn...</p>
      </div>
    );
  }

  if (loadError) return <div className="rounded-2xl border p-10 text-center text-sm text-destructive">{loadError}</div>;

  // Active course for Section 2
  const activeCourse = [...myCourses].filter((course) => course.status === "ACTIVE")
    .sort((left, right) => new Date(right.lastAccessedAt || 0).getTime() - new Date(left.lastAccessedAt || 0).getTime())[0] || null;
  const progressPercent = activeCourse ? activeCourse.progressPercent || 0 : 0;

  // Streak & Days logic
  const currentStreak = metrics?.currentStreak ?? 0;
  const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - todayIndex);
  const activeDateKeys = new Set((progressAnalytics?.contributionHeatmap || [])
    .filter((point) => point.count > 0).map((point) => point.date));

  /** Đổi loại mục tiêu backend thành nhãn tiếng Việt dễ đọc. */
  const goalLabel = (goal: StudyGoalItem) => ({
    DAILY_STREAK: "Duy trì chuỗi ngày học",
    WEEKLY_STUDY_DAYS: "Số ngày học trong tuần",
    COURSE_COMPLETION: "Hoàn thành khóa học",
    LESSON_COMPLETION: "Hoàn thành bài học",
    STUDY_HOURS: "Thời lượng học tập",
  }[goal.studyGoalTypeEnum]);

  return (
    <div className="w-full bg-background text-foreground space-y-0 pb-16">
      {/* ==========================================
          [SECTION 1] Welcome + Streak + Goals (FULL-WIDTH BACK VÀNG #f3e8d8)
          ========================================== */}
      <section className="w-full bg-[#f3e8d8] dark:bg-amber-950/30 py-10 border-b border-amber-200/60 dark:border-amber-800/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Cột trái (span 1, ~40%) */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-amber-100">
                  Chào mừng {user?.fullName || user?.username || "bạn"} đã trở lại!
                </h1>
                <p className="text-xs md:text-sm text-gray-700 dark:text-amber-200/80 mt-1">
                  Hãy giữ vững tiến trình và học tập hiệu quả hôm nay.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/80 dark:bg-black/30 p-3.5 rounded-2xl border border-amber-300/50 shadow-xs w-fit">
                <div className="relative flex items-center justify-center text-4xl">
                  🔥
                </div>
                <div>
                  <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                    {currentStreak} Streak!
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                    Kỷ lục: {metrics?.longestStreak || currentStreak} ngày
                  </p>
                </div>
              </div>
            </div>

            {/* Card "Mục tiêu hôm nay" (Cột giữa) */}
            <div className="bg-white dark:bg-card rounded-2xl p-5 shadow-sm border border-amber-100 dark:border-border/40 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-gray-900 dark:text-foreground">
                  Mục tiêu hôm nay
                </h2>
                <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {personalization?.goal || "Tiến độ học"}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {goals.length > 0 ? (
                  goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      {g.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className={g.status === "COMPLETED" ? "line-through text-gray-400" : "font-medium"}>
                        {goalLabel(g)} ({g.currentValue}/{g.targetValue})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Bạn chưa thiết lập mục tiêu học tập.</p>
                )}
              </div>

              <button
                onClick={() => navigate("/student/goals")}
                className="text-[11px] font-bold text-primary hover:underline self-start flex items-center gap-1 cursor-pointer"
              >
                Cập nhật mục tiêu cá nhân →
              </button>
            </div>

            {/* Card "Streak tuần" (Cột phải) */}
            <div className="bg-white dark:bg-card rounded-2xl p-5 shadow-sm border border-amber-100 dark:border-border/40 flex flex-col justify-between space-y-3">
              <div>
                <h2 className="font-bold text-sm text-gray-900 dark:text-foreground flex items-center gap-1.5">
                  <span>🔥</span>
                  <span>{currentStreak} ngày học liên tiếp</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {Math.min(currentStreak, 7)}/7 ngày học trong tuần 📅
                </p>
              </div>

              {/* Hàng 7 ô vuông đại diện 7 ngày trong tuần */}
              <div className="flex gap-1.5 justify-between items-center my-1">
                {daysOfWeek.map((day, idx) => {
                  const date = new Date(weekStart);
                  date.setDate(weekStart.getDate() + idx);
                  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const isStudied = activeDateKeys.has(dateKey);
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`w-full h-8 rounded-lg flex items-center justify-center font-bold text-[11px] transition-all ${
                          isStudied
                            ? "bg-orange-400 text-white shadow-xs"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {isStudied ? "✓" : ""}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          [SECTION 2] Continue Learning (Course đang học dở)
          ========================================== */}
      <section className="w-full bg-[#e8f5f0] dark:bg-emerald-950/20 py-10 border-b border-emerald-100 dark:border-emerald-900/30">
        <div className="max-w-6xl mx-auto px-6 space-y-4">
          
          {activeCourse ? (
            <>
              {/* Link tiêu đề + Progress bar */}
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/student/courses/${activeCourse.id}`)}
                  className="text-base md:text-lg font-bold text-emerald-950 dark:text-emerald-200 hover:underline flex items-center gap-1 group cursor-pointer text-left"
                >
                  <span>Tiếp tục học {activeCourse.title} →</span>
                </button>

                {/* Progress bar ngay dưới */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300 font-mono">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Card bài học */}
              <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-md bg-white dark:bg-card border border-emerald-100 dark:border-emerald-900/40">
                {/* Nửa trái */}
                <div className="p-6 md:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Bài học tiếp theo:
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-foreground line-clamp-2">
                      {nextLessonTitle || activeCourse.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Danh mục: {activeCourse.categoryName || "Khóa học AILMS"}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/student/courses/${activeCourse.id}`)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer w-fit"
                  >
                    <span>Tiếp tục bài học</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Nửa phải: Ảnh thumbnail bài học */}
                <div className="relative min-h-[220px] bg-muted overflow-hidden">
                  {activeCourse.coverImage ? (
                    <img
                      src={activeCourse.coverImage}
                      alt={activeCourse.title}
                      className="object-cover w-full h-full min-h-[220px]"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-emerald-600/40" />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-card rounded-2xl p-8 text-center space-y-3 border border-emerald-100 dark:border-border/40 shadow-sm">
              <BookOpen className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Bạn chưa tham gia khóa học nào</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Hãy bắt đầu hành trình học tập bằng cách chọn khóa học ưa thích trong Danh mục sản phẩm!
              </p>
              <button
                onClick={() => navigate("/student/catalog")}
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-2.5 rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                Khám phá khóa học ngay
              </button>
            </div>
          )}

        </div>
      </section>

      {/* ==========================================
          [SECTION 2.5] Gợi ý khóa học cho bạn
          ========================================== */}
      {recommendedCourses.length > 0 && (
        <section className="w-full bg-white dark:bg-card py-10 border-b border-border/30">
          <div className="max-w-6xl mx-auto px-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Gợi ý khóa học cho bạn
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Được lựa chọn riêng theo mục tiêu và sở thích cá nhân hóa của bạn.
                </p>
              </div>

              <button
                onClick={() => navigate("/student/catalog")}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {recommendedCourses.slice(0, 6).map((course: any) => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="flex flex-col bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 cursor-pointer overflow-hidden group transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/8"><BookOpen className="h-10 w-10 text-primary/35" /></div>
                    )}
                    {course.level && (
                      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-primary shadow">
                        {formatCourseLevel(course.level)}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-sm font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {course.categoryName}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="font-bold text-foreground">{course.rating}</span>
                        <span>({course.reviewCount} đánh giá)</span>
                      </div>
                      <span className="font-medium text-primary">
                        {course.sellingPrice != null ? `${course.sellingPrice.toLocaleString()}đ` : "Chưa có giá"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
          [SECTION 3] CHỦ ĐỀ HỌC TẬP NỔI BẬT (ÁP ĐÚNG LANDING PAGE)
          ========================================== */}
      <section className="py-10 text-center border-t border-border/40 space-y-6 max-w-6xl mx-auto px-6">
        <h3 className="text-3xl font-extrabold uppercase tracking-wider text-muted-foreground mb-6 mt-6 text-center">
          Chủ đề học tập nổi bật
        </h3>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto px-4">
          {(isExpandedCats ? categories : categories.slice(0, 4)).map((cat) => (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}`}
              className="inline-flex items-center justify-center px-5 py-2.5 sm:px-6 sm:py-3 cursor-pointer hover:scale-105 rounded-2xl border border-border/70 bg-card text-sm font-bold text-foreground hover:border-primary hover:text-primary transition-all shadow-xs animate-in fade-in duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {(categories.length > 4 || hasMoreCats) && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleExpandCats}
              className="rounded-xl px-5 py-2 text-xs font-bold border-border/60 hover:bg-muted text-foreground inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isExpandedCats ? (
                <>
                  Thu gọn
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Xem thêm
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </section>

      {/* ==========================================
          [SECTION 4] KHÓA HỌC NỔI BẬT (ÁP ĐÚNG LANDING PAGE WITH TABS)
          ========================================== */}
      <section id="courses" className="py-16 border-t border-border/40 max-w-6xl mx-auto px-6 sm:px-12 md:px-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl uppercase font-extrabold text-foreground tracking-tight">
            Khóa học nổi bật
          </h2>
          <p className="text-base text-muted-foreground mt-2">
            Lựa chọn các khóa học hàng đầu được phát triển bởi các chuyên gia trong ngành.
          </p>
        </div>

        <Tabs defaultValue="popular" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger
                value="popular"
                className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg"
              >
                Nổi bật
              </TabsTrigger>
              <TabsTrigger
                value="trending"
                className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg"
              >
                Thịnh hành
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg"
              >
                Mới nhất
              </TabsTrigger>
            </TabsList>
          </div>

          {["popular", "trending", "new"].map((tabVal) => {
            const currentCourses =
              tabVal === "popular"
                ? outstandingCourses
                : tabVal === "trending"
                ? trendingCourses
                : latestCourses;

            return (
              <TabsContent key={tabVal} value={tabVal} className="animate-in fade-in-50 duration-300">
                {loadingCourses ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : currentCourses.length > 0 ? (
                    <CourseScrollContainer
                      itemCount={currentCourses.length}
                      onScroll={(e) => handleScroll(e, tabVal as "popular" | "trending" | "new")}
                      /* 
                       * Cấu hình căn lề responsive:
                       * - Khi có ít hơn 3 thẻ khóa học: mobile dùng justify-start để người dùng cuộn mượt từ góc trái qua,
                       *   còn desktop (md) dùng md:justify-center để căn giữa gọn gàng trên màn hình rộng.
                       */
                      className={`flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent snap-x snap-mandatory -mx-6 px-6 md:-mx-12 md:px-12 ${
                        currentCourses.length < 3 ? "justify-start" : "justify-start"
                      } ${currentCourses.length <= 3 ? "md:justify-center" : "md:justify-start"}`}
                    >
                      {currentCourses.map((course) => (
                        <Link
                          key={course.id}
                          to={`/courses/${course.id}`}
                          className="flex-none w-65 sm:w-72.5 snap-start flex flex-col bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 cursor-pointer overflow-hidden group transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <div className="relative aspect-video overflow-hidden bg-muted">
                            {course.image ? (
                              <img
                                src={course.image}
                                alt={course.name || course.title}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-primary/8"><BookOpen className="h-10 w-10 text-primary/35" /></div>
                            )}
                            {course.level && (
                              <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-primary shadow">
                                {formatCourseLevel(course.level)}
                              </div>
                            )}
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="text-sm font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  {course.categoryName}
                                </span>
                              </div>
                              <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                {course.name || course.title}
                              </h3>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-sm text-muted-foreground">
                              {(course.avgRating ?? course.rating) ? (
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                  <span className="font-bold text-foreground">{course.avgRating ?? course.rating}</span>
                                  <span>({course.reviewCount ?? 0} đánh giá)</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">Chưa có đánh giá</span>
                              )}
                              <span className="font-medium text-primary">
                                {course.suggestedPrice != null
                                  ? `${course.suggestedPrice.toLocaleString()}đ`
                                  : course.sellingPrice != null
                                    ? `${course.sellingPrice.toLocaleString()}đ`
                                    : "Chưa có giá"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </CourseScrollContainer>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Chưa có khóa học nào trong danh mục này.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>

    </div>
  );
};
