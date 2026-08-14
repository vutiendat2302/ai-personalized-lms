import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { publicCatalogApi, type PublicCategory, type PublicCourseCard } from "@/api/public/publicCatalogApi";
import { CourseScrollContainer } from "@/components/courses/CourseScrollContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  Layers,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const formatCourseLevel = (level: string | null) => ({
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
}[level ?? ""] ?? level);

/**
 * Màn hình chi tiết danh mục khóa học (CategoryDetail)
 * Hiển thị danh sách khóa học thuộc danh mục, lọc theo cấp độ và khám phá các danh mục khác.
 */
export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Core Category States
  const [category, setCategory] = useState<PublicCategory | null>(null);
  const [categoriesList, setCategoriesList] = useState<PublicCategory[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Courses list states
  const [courses, setCourses] = useState<PublicCourseCard[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseLevelFilter, setCourseLevelFilter] = useState<string>("ALL"); // ALL, BEGINNER, INTERMEDIATE, ADVANCED
  const [coursePage, setCoursePage] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);
  const [relatedCourses, setRelatedCourses] = useState<PublicCourseCard[]>([]);
  const [loadingRelatedCourses, setLoadingRelatedCourses] = useState(false);

  /**
   * Tải thông tin chi tiết của danh mục hiện tại và danh sách tất cả các danh mục để gợi ý.
   */
  useEffect(() => {
    if (!id) return;

    const fetchCategoryAndList = async () => {
      try {
        setLoadingCategory(true);
        setCategoryError(null);
        setCoursePage(0);

        // 1. Fetch category detail
        setLoadingRelatedCourses(true);
        const [countRes, relatedRes, relatedCoursesRes] = await Promise.all([
          publicCatalogApi.getCategoryCourseCounts(),
          publicCatalogApi.getRelatedCategories(id, 6),
          publicCatalogApi.getCategoryRelatedCourses(id, { page: 0, size: 50 }),
        ]);
        const current = countRes.data.data.find((cat) => cat.id === id);
        if (current) {
          setCategory(current);
        } else {
          setCategoryError("Không tìm thấy danh mục này.");
        }
        setCategoriesList(relatedRes.data.data);
        setRelatedCourses(relatedCoursesRes.data.data.content);
      } catch (err: unknown) {
        console.error("Error fetching category info:", err);
        setCategoryError("Không thể tải thông tin danh mục.");
        setRelatedCourses([]);
      } finally {
        setLoadingCategory(false);
        setLoadingRelatedCourses(false);
      }
    };

    void fetchCategoryAndList();
  }, [id]);

  /**
   * Tải danh sách các khóa học thuộc danh mục dựa theo trang và bộ lọc cấp độ.
   */
  useEffect(() => {
    if (!id || !category) return;

    const fetchCategoryCourses = async () => {
      try {
        setLoadingCourses(true);
        const coursesRes = await publicCatalogApi.getCategoryCourses(id, {
          page: coursePage,
          size: 8,
          level: courseLevelFilter === "ALL" ? undefined : courseLevelFilter as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
        });
        if (coursesRes.data.success) {
          const pageData = coursesRes.data.data;
          const content = pageData.content;
          setCourses(prev => (coursePage === 0 ? content : [...prev, ...content]));
          setHasMoreCourses(!pageData.last);
        }
      } catch (err: unknown) {
        console.error("Error fetching courses in category:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    void fetchCategoryCourses();
  }, [id, category, courseLevelFilter, coursePage]);

  /**
   * Thay đổi bộ lọc cấp độ khóa học (Tất cả, Cơ bản, Trung cấp, Nâng cao).
   */
  const handleLevelFilterChange = (level: string) => {
    setCourseLevelFilter(level);
    setCoursePage(0);
  };

  /**
   * Tải thêm trang khóa học tiếp theo.
   */
  const handleLoadMoreCourses = () => {
    setCoursePage(prev => prev + 1);
  };


  if (loadingCategory) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin danh mục...</p>
      </div>
    );
  }

  if (categoryError || !category) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <BookOpen className="h-12 w-12" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Không tìm thấy danh mục</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          {categoryError ?? "Danh mục không tồn tại hoặc đã bị gỡ bỏ."}
        </p>
        <Button onClick={() => { void navigate("/"); }} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  // Stats cho UI
  const categoryStats = {
    coursesCount: category.publicCourseCount,
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      
      {/* 1. CATEGORY HEADER SECTION */}
      <div className="bg-gradient-to-b from-muted/30 to-background border-b border-border py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button & Breadcrumbs */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  void navigate(-1);
                } else {
                  void navigate("/student/dashboard");
                }
              }}
              className="rounded-xl gap-1.5 text-xs font-bold border-border/70 bg-card hover:bg-muted text-foreground cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>

            <nav className="flex items-center space-x-2 text-sm font-semibold text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">{category.name}</span>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Title & Description */}
            <div className="lg:col-span-8 space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                {category.name}
              </h1>
              {category.description && <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-4xl">{category.description}</p>}
            </div>

            {/* Right Side Stats */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-center text-center">
              <div>
                <span className="block text-3xl font-black text-primary">{categoryStats.coursesCount}</span>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Khóa học</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MOST POPULAR COURSES SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Khóa học phổ biến nhất</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Học tập từ các chuyên gia hàng đầu và đối tác của học viện.</p>
          </div>

          {/* Level Filter Buttons */}
          <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-xl w-fit">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "BEGINNER", label: "Cơ bản" },
              { id: "INTERMEDIATE", label: "Trung cấp" },
              { id: "ADVANCED", label: "Nâng cao" },
            ].map(lvl => (
              <Button
                type="button"
                variant="ghost"
                key={lvl.id}
                onClick={() => { handleLevelFilterChange(lvl.id); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-foreground hover:text-white ${
                  courseLevelFilter === lvl.id
                    ? "bg-foreground text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {lvl.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        {loadingCourses && coursePage === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-72 rounded-2xl bg-muted/40 animate-pulse border border-border/50"></div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex flex-col bg-card rounded-2xl border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 cursor-pointer overflow-hidden group transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {course.thumbnailUrl ? <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    /> : <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><BookOpen className="h-8 w-8" /></div>}
                    {course.level && (
                      <Badge className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm text-white font-bold shadow-sm">
                        {formatCourseLevel(course.level)}
                      </Badge>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                      {course.averageRating ? (
                        <div className="flex items-center gap-1 font-bold text-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                          <span>{course.averageRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Chưa có đánh giá</span>
                      )}
                      <span className="font-bold text-primary text-sm">
                        {course.currentPrice != null ? `${course.currentPrice.toLocaleString()}đ` : "Miễn phí"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hasMoreCourses && (
              <div className="text-center pt-4">
                <Button
                  onClick={handleLoadMoreCourses}
                  disabled={loadingCourses}
                  variant="outline"
                  className="rounded-xl px-8 font-bold border-border/80 hover:bg-muted"
                >
                  {loadingCourses ? "Đang tải thêm..." : "Xem thêm khóa học"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
            <Layers className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-semibold">Chưa có khóa học nào thuộc cấp độ này.</p>
          </div>
        )}
      </div>

      {/* 3. SEMANTIC RELATED COURSES SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Khóa học liên quan</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Các khóa học gần với chủ đề này nhưng thuộc lĩnh vực khác.</p>
        </div>

        {loadingRelatedCourses ? (
          <p className="text-sm text-muted-foreground">Đang tải khóa học liên quan...</p>
        ) : relatedCourses.length > 0 ? (
          <CourseScrollContainer
            itemCount={relatedCourses.length}
            className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin"
          >
            {relatedCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group flex w-70 shrink-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                {course.thumbnailUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    <img src={course.thumbnailUrl} alt={course.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {course.level && <Badge className="absolute left-3 top-3 bg-foreground/90 font-bold text-white shadow-sm backdrop-blur-sm">{formatCourseLevel(course.level)}</Badge>}
                  </div>
                ) : (
                  <div className="relative flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground">
                    <BookOpen className="h-8 w-8" />
                    {course.level && <Badge className="absolute left-3 top-3 bg-foreground/90 font-bold text-white shadow-sm backdrop-blur-sm">{formatCourseLevel(course.level)}</Badge>}
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{course.name}</h3>
                    {course.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{course.description}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-4 text-xs text-muted-foreground">
                    {course.averageRating != null ? <span className="flex items-center gap-1 font-bold text-foreground"><Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />{course.averageRating.toFixed(1)}</span> : <span className="text-muted-foreground/70">Chưa có đánh giá</span>}
                    <span className="text-sm font-bold text-primary">{course.currentPrice != null ? `${course.currentPrice.toLocaleString()}đ` : "Miễn phí"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </CourseScrollContainer>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Chưa có khóa học liên quan.</p>
        )}
      </div>

      {/* 4. EXPLORE RELATED CATEGORIES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 border-t border-border/50 pt-12 space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Khám phá các danh mục khác</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tiếp tục học hỏi các lĩnh vực học tập hot nhất hiện nay.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categoriesList
            .filter(cat => cat.id !== id)
            .slice(0, 6)
            .map(otherCat => (
              <Link
                key={otherCat.id}
                to={`/categories/${otherCat.id}`}
                className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 hover:shadow-md transition-all text-center group flex flex-col items-center justify-center space-y-2"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {otherCat.name}
                </span>
              </Link>
            ))}
        </div>
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigate("/explore", { state: { from: `${location.pathname}${location.search}${location.hash}` } });
            }}
            className="rounded-xl px-6 py-2 text-sm font-bold border-border/60 hover:bg-foreground hover:text-white transition-all duration-200"
          >
            Xem thêm
          </Button>
        </div>
      </div>
    </div>
  );
};

