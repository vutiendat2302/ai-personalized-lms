import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { courseApi } from "@/api/courses/courseApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  Layers,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

/**
 * Màn hình chi tiết danh mục khóa học (CategoryDetail)
 * Hiển thị danh sách khóa học thuộc danh mục, lọc theo cấp độ và khám phá các danh mục khác.
 */
export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core Category States
  const [category, setCategory] = useState<any | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Courses list states
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseLevelFilter, setCourseLevelFilter] = useState<string>("ALL"); // ALL, BEGINNER, INTERMEDIATE, ADVANCED
  const [coursePage, setCoursePage] = useState(0);
  const [hasMoreCourses, setHasMoreCourses] = useState(false);

  /**
   * Tải thông tin chi tiết của danh mục hiện tại và danh sách tất cả các danh mục để gợi ý.
   */
  useEffect(() => {
    if (!id) return;

    const fetchCategoryAndList = async () => {
      try {
        setLoadingCategory(true);
        setCategoryError(null);

        // 1. Fetch category detail
        const catRes = await courseApi.getCategoryById(id);
        if (catRes.data.success) {
          setCategory(catRes.data.data);
        } else {
          setCategoryError("Không tìm thấy danh mục này.");
        }

        // 2. Fetch other categories for "Explore Categories" section
        const listRes = await courseApi.getAllCategories();
        if (listRes.data.success) {
          setCategoriesList(listRes.data.data.filter((cat: any) => cat.status === "ACTIVE"));
        }
      } catch (err: any) {
        console.error("Error fetching category info:", err);
        setCategoryError("Không thể tải thông tin danh mục.");
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategoryAndList();
    setCoursePage(0); // Reset page on category change
  }, [id]);

  /**
   * Tải danh sách các khóa học thuộc danh mục dựa theo trang và bộ lọc cấp độ.
   */
  useEffect(() => {
    if (!id || !category) return;

    const fetchCategoryCourses = async () => {
      try {
        setLoadingCourses(true);
        const searchParams: any = {
          categoryId: id,
          page: coursePage,
          size: 8,
          status: "ACTIVE",
        };

        if (courseLevelFilter !== "ALL") {
          searchParams.level = courseLevelFilter;
        }

        const coursesRes = await courseApi.searchCourses(searchParams);
        if (coursesRes.data.success) {
          const pageData = coursesRes.data.data;
          const content = pageData.content || [];
          setCourses(prev => (coursePage === 0 ? content : [...prev, ...content]));
          setHasMoreCourses(!pageData.last);
        }
      } catch (err: any) {
        console.error("Error fetching courses in category:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCategoryCourses();
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

  /**
   * Lấy ảnh minh họa mặc định cho khóa học theo tên danh mục.
   */
  const getCoursePlaceholderImage = (categoryName: string) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("lập trình") || name.includes("code") || name.includes("web") || name.includes("phần mềm") || name.includes("python")) {
      return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60";
    }
    if (name.includes("ai") || name.includes("trí tuệ") || name.includes("máy học") || name.includes("data") || name.includes("khoa học máy tính")) {
      return "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60";
    }
    if (name.includes("thiết kế") || name.includes("design") || name.includes("ui") || name.includes("ux")) {
      return "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60";
    }
    return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60";
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
          {categoryError || "Danh mục không tồn tại hoặc đã bị gỡ bỏ."}
        </p>
        <Button onClick={() => navigate("/")} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại trang chủ
        </Button>
      </div>
    );
  }

  // Stats cho UI
  const categoryStats = {
    coursesCount: category.coursesCount || courses.length || 0,
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
                  navigate(-1);
                } else {
                  navigate("/student/dashboard");
                }
              }}
              className="rounded-xl gap-1.5 text-xs font-bold border-border/70 bg-card hover:bg-muted text-foreground cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Button>

            <nav className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
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
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-4xl">
                {category.description || `Khám phá các khóa học hàng đầu thuộc danh mục ${category.name} trên AILMS. Giúp bạn phát triển các kỹ năng chuyên môn từ cơ bản đến chuyên sâu, xây dựng nền tảng tư duy vững chắc và thực hành ứng dụng thực tế để nâng cao năng lực nghề nghiệp.`}
              </p>
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
              <button
                key={lvl.id}
                onClick={() => handleLevelFilterChange(lvl.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  courseLevelFilter === lvl.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl.label}
              </button>
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
                    <img
                      src={course.image || getCoursePlaceholderImage(category.name)}
                      alt={course.name || course.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    {course.level && (
                      <Badge className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm text-primary font-bold shadow-sm">
                        {course.level}
                      </Badge>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.name || course.title}
                      </h3>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                      {course.avgRating || course.rating ? (
                        <div className="flex items-center gap-1 font-bold text-foreground">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                          <span>{course.avgRating || course.rating}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Chưa có đánh giá</span>
                      )}
                      <span className="font-bold text-primary text-sm">
                        {course.suggestedPrice != null
                          ? `${course.suggestedPrice.toLocaleString()}đ`
                          : course.sellingPrice != null
                            ? `${course.sellingPrice.toLocaleString()}đ`
                            : "Miễn phí"}
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

      {/* 3. EXPLORE OTHER CATEGORIES */}
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
      </div>
    </div>
  );
};
