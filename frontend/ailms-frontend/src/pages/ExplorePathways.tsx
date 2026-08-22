import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { formatCourseLevel } from "@/utils/searchUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { courseApi } from "@/api/courses/courseApi";
import { publicCatalogApi, type PublicCategory, type PublicTeacher } from "@/api/public/publicCatalogApi";
import { 
  Search, 
  Brain, 
  Code, 
  PenTool, 
  BookOpen, 
  Database, 
  Binary, 
  Filter, 
  RotateCcw, 
  Star, 
  Clock, 
  GraduationCap, 
  Award, 
  BookMarked,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

interface SearchCourseItem {
  id: string | number;
  name: string;
  categoryName?: string;
  level?: string;
  duration?: number;
  avgRating?: number;
  enrollmentCount?: number;
  thumbnailUrl?: string;
  image?: string;
  description?: string;
  suggestedPrice?: number;
  createdAt?: string;
}

interface ExploreCourseCard {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: number;
  durationText: string;
  rating: number;
  studentsCount: number;
  image: string;
  tags: string[];
  description: string;
  suggestedPrice?: number;
  createdAt?: string;
}

const LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const LEVEL_VALUES: Record<string, CourseLevel> = {
  "Cơ bản": "BEGINNER",
  "Trung cấp": "INTERMEDIATE",
  "Nâng cao": "ADVANCED",
};

const ITEMS_PER_PAGE = 8;

/**
 * Sinh danh sách các số trang cần hiển thị trên thanh phân trang (1-indexed).
 */
const getPageNumbers = (current: number, total: number) => {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }
  return pages;
};

/**
 * Component chính hiển thị trang Khám phá Lộ trình học tập, lọc theo chủ đề/trình độ và phân trang danh sách khóa học gợi ý.
 */
export const ExplorePathways: React.FC = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [search, setSearch] = useState(() => searchParams.get("keyword") ?? searchParams.get("q") ?? searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("keyword") ?? searchParams.get("q") ?? searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") ?? "Tất cả");
  const [selectedLevel, setSelectedLevel] = useState("Tất cả");
  const [realCourses, setRealCourses] = useState<ExploreCourseCard[]>([]);
  const [totalCourseResults, setTotalCourseResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [teacherPage, setTeacherPage] = useState(0);
  const [hasMoreTeachers, setHasMoreTeachers] = useState(false);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  /** Quay thẳng về trang trước đó (như Dashboard), tránh lùi qua từng từ khóa tìm kiếm trong lịch sử trình duyệt. */
  const handleBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && !from.startsWith("/explore")) {
      void navigate(from, { replace: true });
      return;
    }
    if (auth.accessToken) {
      const userRoles = auth.user?.roles ?? [];
      if (userRoles.includes("TEACHER") || userRoles.includes("TA")) {
        void navigate("/teacher/dashboard", { replace: true });
      } else if (userRoles.includes("ADMIN")) {
        void navigate("/admin/dashboard", { replace: true });
      } else {
        void navigate("/student/dashboard", { replace: true });
      }
      return;
    }
    void navigate("/", { replace: true });
  };

  /** Trì hoãn truy vấn catalog một khoảng ngắn để tìm kiếm realtime không tạo request cho từng phím. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  /** Tải đội ngũ giảng viên thật, không dùng avatar hoặc hồ sơ dựng sẵn. */
  useEffect(() => {
    let ignore = false;
    const loadInitialData = async () => {
      try {
        const [teachersRes, categoriesRes] = await Promise.all([
          publicCatalogApi.getTeachers({ page: 0, size: 6 }),
          publicCatalogApi.getHotCategories({ page: 0, size: 10 }),
        ]);
        if (!ignore) {
          const teacherData = teachersRes.data.data;
          setTeachers(teacherData.content);
          setHasMoreTeachers(!teacherData.last);

          const categoryData = categoriesRes.data.data;
          setCategories(categoryData.content);
        }
      } catch {
        if (!ignore) {
          setTeachers([]);
          setCategories([]);
        }
      }
    };

    void loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  /** Tải thêm giảng viên thật theo trang, không sinh dữ liệu bổ sung ở Frontend. */
  const loadMoreTeachers = async () => {
    const nextPage = teacherPage + 1;
    try {
      const response = await publicCatalogApi.getTeachers({ page: nextPage, size: 6 });
      const page = response.data.data;
      setTeachers((current) => [...current, ...page.content]);
      setTeacherPage(nextPage);
      setHasMoreTeachers(!page.last);
    } catch {
      setHasMoreTeachers(false);
    }
  };

  /** Thu gọn danh sách giảng viên về đúng 6 người đầu tiên. */
  const collapseTeachers = () => {
    setTeachers((current) => current.slice(0, 6));
    setTeacherPage(0);
    setHasMoreTeachers(true);
  };

  /** Tải đúng trang khóa học từ Backend, không cắt kết quả ở giới hạn 50 bản ghi. */
  useEffect(() => {
    let ignore = false;
    const fetchCoursesFromApi = async () => {
      try {
        const categoryId = categories.find((category) => category.name === selectedCategory)?.id;
        const searchPayload: {
          page: number;
          size: number;
          status: string;
          keyword?: string;
          categoryId?: string;
          level?: string;
        } = { page: currentPage - 1, size: ITEMS_PER_PAGE, status: "ACTIVE" };
        if (debouncedSearch) {
          searchPayload.keyword = debouncedSearch;
        }
        if (categoryId) {
          searchPayload.categoryId = categoryId;
        }
        if (selectedLevel !== "Tất cả") {
          searchPayload.level = LEVEL_VALUES[selectedLevel];
        }
        const res = await courseApi.searchCourses(searchPayload);
        if (!ignore) {
          if (res.data.success && res.data.data) {
            const data = res.data.data as { totalElements?: number; content: SearchCourseItem[] };
            setTotalCourseResults(data.totalElements ?? 0);
            const mapped: ExploreCourseCard[] = data.content.map((c) => ({
              id: String(c.id),
              title: c.name,
              category: c.categoryName ?? "Chưa phân loại",
              level: (c.level && c.level in LEVEL_LABELS ? LEVEL_LABELS[c.level as CourseLevel] : null) ?? "Chưa cập nhật",
              duration: c.duration ?? 0,
              durationText: c.duration ? `${String(c.duration)} giờ học` : "Thời lượng chưa cập nhật",
              rating: c.avgRating ?? 0,
              studentsCount: c.enrollmentCount ?? 0,
              image: c.thumbnailUrl ?? c.image ?? "",
              tags: [c.categoryName, c.level].filter((item): item is string => Boolean(item)),
              description: c.description ?? "",
              suggestedPrice: c.suggestedPrice,
              createdAt: c.createdAt,
            }));
            setRealCourses(mapped);
          } else {
            setRealCourses([]);
            setTotalCourseResults(0);
          }
        }
      } catch (err) {
        console.error("Error searching courses in ExplorePathways:", err);
        if (!ignore) {
          setRealCourses([]);
          setTotalCourseResults(0);
        }
      }
    };

    void fetchCoursesFromApi();
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, selectedCategory, selectedLevel, currentPage, categories]);

  /** Giữ dữ liệu từ Backend; keyword/category/level đã được áp dụng ở query server. */
  const filteredCourses = useMemo(() => realCourses, [realCourses]);

  /** Đưa người dùng thẳng tới danh sách khóa học sau khi tìm kiếm từ Header. */
  useEffect(() => {
    if (location.hash === "#courses") {
      requestAnimationFrame(() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location.hash, location.search]);

  /** Tính tổng số trang dựa trên danh sách đã lọc. */
  const totalPages = Math.ceil(totalCourseResults / ITEMS_PER_PAGE);

  /** Cắt danh sách khóa học đã lọc để chỉ hiển thị tối đa 8 khóa học trên trang hiện tại. */
  const displayedCourses = useMemo(() => filteredCourses, [filteredCourses]);

  /** Xử lý thay đổi từ khóa tìm kiếm và cập nhật URL. */
  const handleSearchChange = (newVal: string) => {
    setSearch(newVal);
    setCurrentPage(1);
  };

  /** Xử lý thay đổi danh mục và chuyển về trang 1. */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  /** Xử lý thay đổi trình độ và chuyển về trang 1. */
  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    setCurrentPage(1);
  };

  /** Đặt lại tất cả các bộ lọc về mặc định và quay về trang 1. */
  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("Tất cả");
    setSelectedLevel("Tất cả");
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto max-w-none w-full px-4 py-8 sm:px-6 lg:px-12 space-y-6 animate-in fade-in-50 duration-300">
      
      {/* Nút quay lại trang trước */}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="rounded-xl px-4 py-2 text-xs font-bold border-border/60 hover:bg-muted text-foreground inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="h-4 w-4 text-primary" />
          Quay lại
        </Button>
      </div>

      {/* ==========================================
          HERO SECTION & SEARCH BAR WITH SMART FILTERS
          ========================================== */}
      <div className="relative rounded-3xl bg-linear-to-r from-primary via-indigo-950 to-neutral-900 p-8 md:p-12 text-white overflow-hidden shadow-2xl shadow-primary/10">
        {/* Background Decorative Circles */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 translate-y-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3.5 py-1 rounded-full text-sm font-bold text-white backdrop-blur-md">
            <BookMarked className="h-4 w-4 text-white" />
            <span>Lộ trình tối ưu bằng Trí Tuệ Nhân Tạo</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Khám Phá Lộ Trình Học Tập <br className="hidden sm:inline" />
            <span className="bg-linear-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Chinh Phục Kiến Thức Mới
            </span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-light-gray leading-relaxed max-w-2xl">
            Tận dụng bộ lọc thông minh để nhanh chóng chọn lựa các khóa học được sắp xếp khoa học, hỗ trợ gợi ý cá nhân hóa và phù hợp nhất với năng lực của riêng bạn.
          </p>

          {/* Search Box & Filters Container */}
          <div className="pt-4 space-y-4 max-w-3xl">
            {/* Search Input */}
            <div className="relative flex items-center w-full">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nhập tên khóa học, kỹ năng, hoặc từ khóa"
                value={search}
                onChange={(e) => { handleSearchChange(e.target.value); }}
                className="w-full h-12 pl-12 pr-4 bg-white text-black/90 font-semibold placeholder:text-muted-foreground/50 rounded-2xl border-0 shadow-lg text-base focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-white"
              />
              {search && (
                <button 
                  onClick={() => { handleSearchChange(""); }} 
                  className="absolute right-4 text-sm font-bold text-muted-foreground hover:text-black transition-colors cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Smart Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* Category selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-white">Chủ đề khóa học</label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-10 rounded-xl border-white/20 bg-white/10 text-white/60 font-semibold hover:bg-white/15 focus:ring-white/40">
                    <SelectValue placeholder="Tất cả chủ đề" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tất cả">Tất cả chủ đề</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Level selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-white font-semibold">Trình độ học lực</label>
                <Select value={selectedLevel} onValueChange={handleLevelChange}>
                  <SelectTrigger className="h-10 rounded-xl border-white/20 bg-white/10 font-semibold text-white/60 hover:bg-white/15 focus:ring-white/40">
                    <SelectValue placeholder="Tất cả trình độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tất cả">Tất cả trình độ</SelectItem>
                    <SelectItem value="Cơ bản">Cơ bản</SelectItem>
                    <SelectItem value="Trung cấp">Trung cấp</SelectItem>
                    <SelectItem value="Nâng cao">Nâng cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters trigger */}
            {(search || selectedCategory !== "Tất cả" || selectedLevel !== "Tất cả") && (
              <div className="flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Đặt lại tất cả bộ lọc</span>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ==========================================
          COURSES LISTING GRID (FILTERED & PAGINATED)
          ========================================== */}
      <div id="courses" className="scroll-mt-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>Danh Sách Khóa Học Gợi Ý</span>
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {totalCourseResults} kết quả
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">Các bài học được hiển thị dựa trên thông tin lọc của bạn.</p>
          </div>
        </div>

        {displayedCourses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex flex-col bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden hover:shadow-md group transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {/* Course Header Image */}
                  <div className="relative aspect-video overflow-hidden">
                    {course.image ? <img
                      src={course.image}
                      alt={course.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    /> : <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><BookOpen className="h-8 w-8" /></div>}
                    <div className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-white shadow-sm border border-border/20">
                      {formatCourseLevel(course.level)}
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {course.tags.map((t: string) => (
                          <span key={t} className="text-sm font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {t}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                      {course.createdAt && <p className="text-xs text-muted-foreground">Tạo ngày {new Date(course.createdAt).toLocaleDateString("vi-VN")}</p>}
                    </div>

                    {/* Rating, Students Count & Duration */}
                    <div className="pt-4 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="font-bold text-foreground">{course.rating.toFixed(1)}</span>
                        <span>({course.studentsCount})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{course.durationText}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  Hiển thị{" "}
                  <strong className="text-foreground font-bold">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-foreground font-bold">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCourseResults)}
                  </strong>{" "}
                  trên tổng số{" "}
                  <strong className="text-foreground font-bold">{totalCourseResults}</strong> khóa học
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage((prev) => Math.max(1, prev - 1)); }}
                    className="rounded-xl px-3 h-9 text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Trước
                  </Button>

                  {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots-${String(idx)}`} className="px-2 text-sm text-muted-foreground font-bold">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <Button
                        key={`page-${String(pageNum)}`}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setCurrentPage(pageNum); }}
                        className={`rounded-xl w-9 h-9 text-xs font-semibold cursor-pointer ${
                          isCurrent ? "bg-primary text-white shadow-sm" : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => { setCurrentPage((prev) => Math.min(totalPages, prev + 1)); }}
                    className="rounded-xl px-3 h-9 text-xs font-semibold cursor-pointer"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="py-16 text-center border border-dashed border-border rounded-3xl max-w-xl mx-auto space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Filter className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Không tìm thấy khóa học phù hợp</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Không tìm thấy kết quả nào khớp với bộ lọc hiện tại của bạn. Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm nút đặt lại bộ lọc.
              </p>
            </div>
            <Button onClick={handleResetFilters} variant="outline" size="sm" className="rounded-xl">
              <RotateCcw className="mr-2 h-4 w-4" />
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* ==========================================
          POPULAR COURSE CATEGORIES (HOT CATEGORIES) - BELOW COURSES LISTING
          ========================================== */}
      <div className="space-y-6 pt-6 border-t border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Danh Mục Khóa Học Thịnh Hành</h2>
            <p className="text-sm text-muted-foreground">Chọn các chủ đề đang được quan tâm nhiều nhất để định hướng lộ trình học tập.</p>
          </div>

          {/* Scroll Control Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border/60 hover:bg-muted cursor-pointer shadow-xs"
              onClick={() => { categoryScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" }); }}
              aria-label="Cuộn danh mục sang trái"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border/60 hover:bg-muted cursor-pointer shadow-xs"
              onClick={() => { categoryScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" }); }}
              aria-label="Cuộn danh mục sang phải"
            >
              <ArrowRight className="h-4 w-4 text-foreground" />
            </Button>
          </div>
        </div>

        <div
          ref={categoryScrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/30 scroll-smooth"
        >
          {categories.map((cat, idx) => {
            const Icon = [Brain, Code, PenTool, BookOpen, Binary, Database][idx % 6];
            const iconColor = [
              "text-primary bg-primary/10",
              "text-indigo-600 bg-indigo-500/10",
              "text-pink-600 bg-pink-500/10",
              "text-amber-600 bg-amber-500/10",
              "text-emerald-600 bg-emerald-500/10",
              "text-sky-600 bg-sky-500/10",
            ][idx % 6];
            return (
              <Link
                key={cat.id}
                to={`/categories/${cat.id}`}
                className="shrink-0 w-56 p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/50 text-left flex flex-col justify-between h-36 snap-start transition-all duration-300 hover:shadow-md hover:-translate-y-1 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {cat.publicCourseCount} khóa học công khai
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="space-y-6 pt-6 border-t border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Đội Ngũ Giảng Viên Chuyên Gia</h2>
          <p className="text-sm text-muted-foreground">Gặp gỡ đội ngũ giảng viên giàu kinh nghiệm, dẫn dắt bạn trên lộ trình học tập cá nhân hóa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teachers.map((ins) => (
            <Link 
              key={ins.id} 
              to={`/teachers/${ins.id}`}
              className="p-6 bg-card border border-border/40 rounded-2xl shadow-sm space-y-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <div className="space-y-4">
                {/* Header: Photo, Name & Title */}
                <div className="flex gap-4 items-center">
                  <div className="h-16 w-16 rounded-full border border-primary/20 bg-primary/5 overflow-hidden shrink-0">
                    {ins.avatarUrl ? <img src={ins.avatarUrl} alt={ins.fullName ?? "Giảng viên"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">{(ins.fullName ?? "?").charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors">{ins.fullName ?? "Giảng viên AILMS"}</h3>
                    <p className="text-sm font-bold text-primary">{ins.title ?? (ins.categories[0] ? ins.categories[0].name : null) ?? "Giảng viên"}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{ins.categories.map((category) => category.name).join(", ") || "Chuyên môn đang cập nhật"}</span>
                    </div>
                  </div>
                </div>

                {/* Bio Description */}
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  &ldquo;{ins.bio ?? "Thông tin giới thiệu đang được cập nhật."}&rdquo;
                </p>
              </div>

              {/* Stats Footer */}
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-amber-500" />
                    <span>Đánh giá: <strong>{ins.averageRating ? `${ins.averageRating.toFixed(1)} ★` : "Chưa có dữ liệu"}</strong></span>
                </div>
                <div>
                    <span>Giảng dạy: <strong>{ins.courseCount} khóa học</strong></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {(hasMoreTeachers || teachers.length > 6) && (
          <div className="flex justify-center pt-2">
            {hasMoreTeachers && <Button type="button" variant="outline" className="rounded-xl font-semibold text-primary hover:bg-foreground hover:text-white" onClick={() => { void loadMoreTeachers(); }}>Xem thêm giảng viên</Button>}
            {teachers.length > 6 && <Button type="button" variant="outline" className="ml-3 rounded-xl font-semibold text-primary hover:bg-foreground hover:text-white" onClick={() => { collapseTeachers(); }}>Thu gọn</Button>}
          </div>
        )}
      </div>

    </div>
  );
};

