import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { courseApi } from "@/api/courses/courseApi";
import { reviewApi } from "@/api/reviews/reviewApi";
import { studentApi } from "@/api/students/studentApi";
import { useModalStore } from "@/store/useModalStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Star,
  Sparkles,
  Brain,
  ShieldCheck,
  Zap,
  ChevronDown,
  Search,
  BookOpen,
  GraduationCap,
  Award
  ,CalendarDays
} from "lucide-react";
import { publicCatalogApi, type PublicTeacher } from "@/api/public/publicCatalogApi";
import { CourseScrollContainer } from "@/components/courses/CourseScrollContainer";
import type { PageResponse } from "@/types/base";
import { formatCourseLevel } from "@/utils/searchUtils";
import { resolveAvatarUrl } from "@/utils/avatarUrl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LandingCourse {
  id: string;
  name: string;
  image?: string | null;
  thumbnailUrl?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  level?: string | null;
  createdAt?: string | null;
  avgRating?: number | null;
  enrollmentCount?: number | null;
  suggestedPrice?: number | null;
}


interface LandingReview {
  id: string;
  rating?: number | null;
  courseId?: string | null;
  courseName?: string | null;
  userName?: string | null;
  userFullName?: string | null;
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  userAvatar?: string | null;
  schoolName?: string | null;
  userRole?: string | null;
  role?: string | null;
  comment?: string | null;
  content?: string | null;
  description?: string | null;
  createdAt?: string | null;
  user?: { fullName?: string | null; username?: string | null; avatarUrl?: string | null; avatar?: string | null; role?: string | null } | null;
}

const formatRoundedCount = (count: number | null | undefined): string => {
  if (count === null || count === undefined || isNaN(count)) return "Không có dữ liệu";
  if (count <= 0) return "0";
  if (count < 10) return count.toString() + "+";

  const magnitude = Math.pow(10, Math.floor(Math.log10(count)));
  const rounded = Math.floor(count / magnitude) * magnitude;
  return rounded.toLocaleString() + "+";
};

/** Chuyển giá trị đếm từ API (số hoặc chuỗi số) thành số hợp lệ để hiển thị. */
const parseCount = (value: number | string | null | undefined): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Định dạng thời gian review từ dữ liệu backend, bỏ qua giá trị ngày không hợp lệ. */
const formatReviewDate = (createdAt: string | null | undefined): string => {
  if (!createdAt) return "Chưa có dữ liệu";
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "Chưa có dữ liệu" : date.toLocaleString("vi-VN");
};


export const Landing: React.FC = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openRegister } = useModalStore();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [categories, setCategories] = useState<import("@/api/public/publicCatalogApi").PublicCategory[]>([]);
  const [catPage, setCatPage] = useState(0);
  const [hasMoreCats, setHasMoreCats] = useState(false);
  const [isExpandedCats, setIsExpandedCats] = useState(false);

  const fetchCategories = async (page: number) => {
    try {
      const res = await publicCatalogApi.getHotCategories({ page, size: 8 });
      if (!res.data.success) return;
      const pageData = res.data.data;
      setCategories(prev => (page === 0 ? pageData.content : [...prev, ...pageData.content]));
      setHasMoreCats(!pageData.last);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
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

  const [outstandingCourses, setOutstandingCourses] = useState<LandingCourse[]>([]);
  const [trendingCourses, setTrendingCourses] = useState<LandingCourse[]>([]);
  const [latestCourses, setLatestCourses] = useState<LandingCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [teacherPage, setTeacherPage] = useState(0);
  const [hasMoreTeachers, setHasMoreTeachers] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const [popularPage, setPopularPage] = useState(0);
  const [trendingPage, setTrendingPage] = useState(0);
  const [newPage, setNewPage] = useState(0);

  /** Tải danh sách giảng viên đang hoạt động từ Backend, không dùng dữ liệu mẫu. */
  useEffect(() => {
    let cancelled = false;
    publicCatalogApi.getTeachers({ page: 0, size: 6 })
      .then((response) => {
        if (!cancelled) {
          const page = response.data.data;
          setTeachers(page.content);
          setHasMoreTeachers(!page.last);
        }
      })
      .catch(() => {
        if (!cancelled) setTeachers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTeachers(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [hasMorePopular, setHasMorePopular] = useState(false);
  const [hasMoreTrending, setHasMoreTrending] = useState(false);
  const [hasMoreNew, setHasMoreNew] = useState(false);

  const [reviews, setReviews] = useState<LandingReview[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loadingAvgRating, setLoadingAvgRating] = useState(false);

  const [activeCoursesCount, setActiveCoursesCount] = useState<number | null>(null);
  const [loadingActiveCoursesCount, setLoadingActiveCoursesCount] = useState(false);

  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loadingStudentCount, setLoadingStudentCount] = useState(false);

  const [reviewSearchName, setReviewSearchName] = useState("");
  const [reviewFilterRating, setReviewFilterRating] = useState<string>("5");
  const [reviewSort, setReviewSort] = useState("createdAt:desc");

  // Autocomplete states for courses
  const [coursesList, setCoursesList] = useState<{ id: string; name: string }[]>([]);
  const [loadingCoursesList, setLoadingCoursesList] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; name: string } | null>(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  const isLoadingCoursesRef = useRef(false);



  /** Tải thêm 6 giảng viên công khai theo đúng phân trang của Backend. */
  const handleLoadMoreTeachers = async () => {
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

  /** Thu gọn đội ngũ về 6 giảng viên đầu tiên theo thứ tự Backend trả về. */
  const handleCollapseTeachers = () => {
    setTeachers((current) => current.slice(0, 6));
    setTeacherPage(0);
    setHasMoreTeachers(true);
  };

  const fetchFeaturedCourses = async () => {
    try {
      setLoadingCourses(true);
      const [outstandingRes, trendingRes, latestRes] = await Promise.all([
        courseApi.getOutstandingCourses({ page: 0, size: 6 }),
        courseApi.getTrendingCourses({ page: 0, size: 6 }),
        courseApi.getLatestCourses({ page: 0, size: 6 })
      ]);

      if (outstandingRes.data.success) {
        const pageData = outstandingRes.data.data as PageResponse<LandingCourse>;
        console.log("[fetchFeaturedCourses] popular data:", pageData);
        setOutstandingCourses(pageData.content);
        setHasMorePopular(!pageData.last);
      }
      if (trendingRes.data.success) {
        const pageData = trendingRes.data.data as PageResponse<LandingCourse>;
        console.log("[fetchFeaturedCourses] trending data:", pageData);
        setTrendingCourses(pageData.content);
        setHasMoreTrending(!pageData.last);
      }
      if (latestRes.data.success) {
        const pageData = latestRes.data.data as PageResponse<LandingCourse>;
        console.log("[fetchFeaturedCourses] latest data:", pageData);
        setLatestCourses(pageData.content);
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
      console.log(`[loadMoreCourses] tabVal: ${tabVal}, popularPage: ${String(popularPage)}, trendingPage: ${String(trendingPage)}, newPage: ${String(newPage)}`);
      if (tabVal === "popular") {
        const nextPage = popularPage + 1;
        const res = await courseApi.getOutstandingCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data as PageResponse<LandingCourse>;
          setOutstandingCourses(prev => [...prev, ...pageData.content]);
          setPopularPage(nextPage);
          setHasMorePopular(!pageData.last);
        }
      } else if (tabVal === "trending") {
        const nextPage = trendingPage + 1;
        const res = await courseApi.getTrendingCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data as PageResponse<LandingCourse>;
          setTrendingCourses(prev => [...prev, ...pageData.content]);
          setTrendingPage(nextPage);
          setHasMoreTrending(!pageData.last);
        }
      } else {
        const nextPage = newPage + 1;
        const res = await courseApi.getLatestCourses({ page: nextPage, size: 6 });
        if (res.data.success) {
          const pageData = res.data.data as PageResponse<LandingCourse>;
          setLatestCourses(prev => [...prev, ...pageData.content]);
          setNewPage(nextPage);
          setHasMoreNew(!pageData.last);
        }
      }
    } catch (e) {
      console.error("Failed to load more courses:", e);
    } finally {
      isLoadingCoursesRef.current = false;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, tabVal: "popular" | "trending" | "new") => {
    const container = e.currentTarget;
    const scrollRight = container.scrollWidth - container.scrollLeft - container.clientWidth;
    
    const hasMore = 
      tabVal === "popular" ? hasMorePopular : 
      tabVal === "trending" ? hasMoreTrending : 
      hasMoreNew;

    const isLoading = isLoadingCoursesRef.current || loadingCourses;

    if (scrollRight < 150 && hasMore && !isLoading) {
      console.log(`[Scroll] Triggering loadMoreCourses for ${tabVal}`);
      void loadMoreCourses(tabVal);
    }
  };

  const fetchReviews = async (page: number) => {
    try {
      setLoadingReviews(true);
      const params: {
        page: number;
        size: number;
        status: string;
        rating?: number;
        courseId?: string;
        keyword?: string;
        sort?: string[];
      } = {
        page,
        size: 3,
        status: "ACTIVE"
      };

      if (reviewFilterRating && reviewFilterRating !== "ALL") {
        params.rating = parseInt(reviewFilterRating, 10);
      }

      if (selectedCourse) {
        params.courseId = selectedCourse.id;
      }

      if (reviewSearchName.trim()) {
        params.keyword = reviewSearchName.trim();
      }

      if (reviewSort) {
        params.sort = [reviewSort];
      }

      const res = await reviewApi.searchReviews(params);
      if (res.data.success) {
        const pageData = res.data.data as PageResponse<LandingReview>;
        const newReviews = pageData.content;
        setReviews(prev => (page === 0 ? newReviews : [...prev, ...newReviews]));
        setHasMoreReviews(!pageData.last);
      }
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchAverageRating = async () => {
    try {
      setLoadingAvgRating(true);
      const res = await reviewApi.getAverageRating();
      console.log("[fetchAverageRating] API Response:", res.data);
      const rawData = res.data.data;
      if (typeof rawData === "number" && !isNaN(rawData)) {
        setAverageRating(rawData);
      } else {
        setAverageRating(null);
      }
    } catch (e) {
      console.error("[fetchAverageRating] Error:", e);
      setAverageRating(null);
    } finally {
      setLoadingAvgRating(false);
    }
  };

  const fetchActiveCoursesCount = async () => {
    try {
      setLoadingActiveCoursesCount(true);
      const res = await courseApi.getActiveCoursesCount();
      console.log("[fetchActiveCoursesCount] API Response:", res.data);
      setActiveCoursesCount(parseCount(res.data.data));
    } catch (e) {
      console.error("[fetchActiveCoursesCount] Error:", e);
      setActiveCoursesCount(null);
    } finally {
      setLoadingActiveCoursesCount(false);
    }
  };

  const fetchStudentCount = async () => {
    try {
      setLoadingStudentCount(true);
      const res = await studentApi.getStudentProfilesCount();
      console.log("[fetchStudentCount] API Response:", res.data);
      setStudentCount(parseCount(res.data.data));
    } catch (e) {
      console.error("[fetchStudentCount] Error:", e);
      setStudentCount(null);
    } finally {
      setLoadingStudentCount(false);
    }
  };

  const handleLoadMoreReviews = () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    void fetchReviews(nextPage);
  };

  const handleCollapseReviews = () => {
    setReviewPage(0);
    void fetchReviews(0);
  };

  // Autocomplete fetch for courses
  const fetchCoursesForSelect = async (query: string) => {
    try {
      setLoadingCoursesList(true);
      console.log(`[fetchCoursesForSelect] query: "${query}"`);
      const res = await courseApi.searchCourses({
        keyword: query,
        size: 15,
        status: "ACTIVE",
        sortBy: "id",
        sortDirection: "DESC"
      });
      console.log(`[fetchCoursesForSelect] response:`, res.data);
      if (res.data.success) {
        const pageData = res.data.data as PageResponse<{ id: string; name: string }>;
        setCoursesList(pageData.content);
      }
    } catch (e) {
      console.error("Failed to fetch courses for select:", e);
    } finally {
      setLoadingCoursesList(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  // Fetch courses query watcher
  useEffect(() => {
    if (showCourseDropdown) {
      console.log(`[courseSearchQuery watcher] query: "${courseSearchQuery}", show: ${String(showCourseDropdown)}`);
      const timer = setTimeout(() => {
        void fetchCoursesForSelect(courseSearchQuery);
      }, 300);
      return () => { clearTimeout(timer); };
    }
  }, [courseSearchQuery, showCourseDropdown]);

  // Debounced search for review filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setReviewPage(0);
      void fetchReviews(0);
    }, 400);
    return () => { clearTimeout(timer); };
  }, [reviewSearchName, reviewFilterRating, selectedCourse, reviewSort]);

  useEffect(() => {
    const initData = async () => {
      await fetchCategories(0);
      await fetchFeaturedCourses();
      await fetchAverageRating();
      await fetchActiveCoursesCount();
      await fetchStudentCount();
    };
    void initData();
  }, []);



  useEffect(() => {
    if (auth.accessToken && auth.user) {
      void navigate("/dashboard", { replace: true });
    }
  }, [auth.accessToken, auth.user, navigate]);

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const id = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [location.hash]);

  const toggleFaq = (id: string) => {
    setOpenFaq(prev => (prev === id ? null : id));
  };

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Background gradients decor */}
      <div className="absolute top-0 left-1/4 -z-10 h-124 w-125 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute top-100 right-1/4 -z-10 h-100 w-100 translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ==========================================
            HERO SECTION
            ========================================== */}
        <section className="py-20 md:py-28 text-center relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-base font-semibold text-foreground mb-6 animate-bounce">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng học tập thông minh thế hệ mới</span>
          </div>

          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-primary leading-[1.15] mb-8">
            Học tập Cá nhân hóa <br />
            <span className="bg-linear-to-r from-primary via-indigo-600 to-accent bg-clip-text text-transparent">
              Đột phá nhờ Trí tuệ Nhân tạo
            </span>
          </h1>

          <p className="mx-auto max-w-4xl text-2xl text-muted-foreground leading-relaxed mb-16">
            AILMS tự động phân tích năng lực, thiết lập lộ trình học tập tối ưu, và cung cấp phản hồi tức thì để giúp bạn chinh phục mọi đỉnh cao kiến thức một cách nhanh chóng nhất.
          </p>

          <div className="flex justify-center gap-4">
            {auth.accessToken ? (
              <Link to="/dashboard">
                <Button size="lg" className="rounded-full px-8 py-6 text-base font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xl shadow-primary/20">
                  Vào Dashboard của bạn
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Button onClick={openRegister} variant="ghost" size="lg" className="rounded-full px-8 py-6 text-base border border-border/50 font-bold bg-primary hover:bg-accent-foreground text-primary-foreground shadow-xl shadow-primary/20">
                  Bắt đầu học miễn phí
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button onClick={() => { void navigate("/explore", { state: { from: `${location.pathname}${location.search}${location.hash}` } }); }} variant="outline" size="lg" className="rounded-full px-8 py-6 text-base font-bold hover:bg-primary hover:text-white">
                  Khám phá lộ trình
                </Button>
              </>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-20 p-6 bg-card rounded-2xl border border-border/70 shadow-md">
            <div>
              <p className="text-3xl font-extrabold text-accent">
                {loadingStudentCount ? "..." : formatRoundedCount(studentCount)}
              </p>
              <p className="text-sm text-muted-foreground font-semibold mt-1">Học viên hoạt động</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">
                {loadingActiveCoursesCount ? "..." : formatRoundedCount(activeCoursesCount)}
              </p>
              <p className="text-sm text-muted-foreground font-semibold mt-1">Khóa học chuyên sâu</p>
            </div>


            <div>
              <p className="text-3xl font-extrabold text-accent">95%</p>
              <p className="text-sm text-muted-foreground font-semibold mt-1">Tỷ lệ hoàn thành mục tiêu</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">
                {loadingAvgRating
                  ? "..."
                  : averageRating !== null
                  ? `${averageRating.toFixed(1)}★`
                  : "Không có dữ liệu"}
              </p>
              <p className="text-sm text-muted-foreground font-semibold mt-1">Đánh giá trung bình</p>
            </div>
          </div>
        </section>

        {/* ==========================================
            FEATURES SECTION
            ========================================== */}
        <section id="features" className="py-16 border-t border-border/60">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-foreground uppercase tracking-tight">Tại sao chọn AILMS?</h2>
            <p className="text-base text-muted-foreground mt-2">Nền tảng tích hợp những công nghệ hiện đại nhất hỗ trợ việc học hiệu quả.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Lộ trình AI Cá nhân hóa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống tự động phát hiện lỗ hổng kiến thức để tinh chỉnh tài liệu và bài tập phù hợp với tốc độ học của bạn.
              </p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Đánh giá thông minh</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chấm điểm tự động và chỉ ra điểm sai sót ngay lập tức cùng với lý do giải thích chi tiết nhất.
              </p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Báo cáo & Phân tích trực quan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Biểu đồ đo lường tiến độ, chỉ số Streak hàng ngày cùng các thống kê điểm số giúp bạn có cái nhìn rõ nét nhất về hành trình học.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            CATEGORY TAGS (REAL DATA)
            ========================================== */}
        <section className="py-10 text-center border-t border-border/40 space-y-6">
          <h3 className="text-3xl font-extrabold uppercase tracking-wider text-muted-foreground mb-6 mt-6 text-center">
            Chủ đề học tập nổi bật
          </h3>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl mx-auto px-4">
            {(isExpandedCats ? categories : categories.slice(0, 4)).map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.id}`}
                className="inline-flex items-center justify-center px-3 py-2 sm:px-3 sm:py- cursor-pointer hover:scale-105 rounded-full border border-border/70 bg-card text-sm font-bold text-foreground hover:border-primary hover:text-primary transition-all shadow-xs animate-in fade-in duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                onClick={() => { void handleToggleExpandCats(); }}
                className="m-2 rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-foreground hover:text-white transition-all duration-200"
              >
                {isExpandedCats ? "Thu Gọn" : "Xem Thêm"}
              </Button>
            </div>
          )}
        </section>

        {/* ==========================================
            COURSES SECTION (WITH TABS)
            ========================================== */}
        <section id="courses" className="py-16 border-t border-border/40">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl uppercase font-extrabold text-foreground tracking-tight">Khóa học nổi bật</h2>
            <p className="text-base text-muted-foreground mt-2">Lựa chọn các khóa học hàng đầu được phát triển bởi các chuyên gia trong ngành.</p>
          </div>
          <Tabs defaultValue="popular" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-muted p-1 rounded-xl">
                <TabsTrigger value="popular" className="px-5  py-2 m-1 border-border/20 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-full">Nổi bật</TabsTrigger>
                <TabsTrigger value="trending" className="px-5 py-2 m-1 border-border/20  text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-full">Thịnh hành</TabsTrigger>
                <TabsTrigger value="new" className="px-5 py-2 m-1 border-border/20 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-full">Mới nhất</TabsTrigger>
              </TabsList>
            </div>

            {["popular", "trending", "new"].map((tabVal) => {
              const currentCourses = 
                tabVal === "popular" ? outstandingCourses :
                tabVal === "trending" ? trendingCourses :
                latestCourses;

              return (
                <TabsContent key={tabVal} value={tabVal} className="animate-in fade-in-50 duration-300">
                  {loadingCourses ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : currentCourses.length > 0 ? (
                    <CourseScrollContainer
                      itemCount={currentCourses.length}
                      onScroll={(e: React.UIEvent<HTMLDivElement>) => { handleScroll(e, tabVal as "popular" | "trending" | "new"); }}
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
                            {course.thumbnailUrl || course.image || course.coverImage || course.imageUrl ? (
                              <img
                                src={resolveAvatarUrl(course.thumbnailUrl || course.image || course.coverImage || course.imageUrl)}
                                alt={course.name}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                <BookOpen className="h-10 w-10" aria-label="Khóa học chưa có ảnh" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3 bg-foreground/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-white shadow">
                              {formatCourseLevel(course.level)}
                            </div>
                          </div>
                          
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                <span className="text-sm font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  {course.categoryName}
                                </span>
                              </div>
                              <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                {course.name}
                              </h3>
                              {course.createdAt && <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Tạo ngày {new Date(course.createdAt).toLocaleDateString("vi-VN")}</span>}
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-sm text-muted-foreground">
                              {course.avgRating ? (
                                <div className="flex items-center gap-1.5">
                                  <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                  <span className="font-bold text-foreground">{course.avgRating.toFixed(1)}</span>
                                  <span>({course.enrollmentCount ?? 0} học viên)</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">Chưa có đánh giá</span>
                              )}
                              <span className="font-medium text-primary">
                                {course.suggestedPrice ? `${course.suggestedPrice.toLocaleString()}đ` : "Miễn phí"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </CourseScrollContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Không có khóa học nào thuộc nhóm này.
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>

        {/* ==========================================
            INSTRUCTORS TEAM SECTION (ĐỘI NGŨ GIẢNG VIÊN CHUYÊN GIA)
            ========================================== */}
        <section className="py-16 border-t border-border/40">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-3xl uppercase font-extrabold text-foreground tracking-tight">Đội Ngũ Giảng Viên Chuyên Gia</h2>
            <p className="text-base text-muted-foreground">Gặp gỡ đội ngũ giảng viên giàu kinh nghiệm, dẫn dắt bạn trên lộ trình học tập cá nhân hóa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
            {loadingTeachers ? <div className="md:col-span-3 py-12 text-center text-muted-foreground">Đang tải đội ngũ giảng viên...</div> : teachers.length === 0 ? <div className="md:col-span-3 py-12 text-center text-muted-foreground">Chưa có dữ liệu giảng viên.</div> : teachers.map((ins) => (
              <Link 
                key={ins.id} 
                to={`/teachers/${ins.id}`}
                className="p-6 bg-card border border-border/70 rounded-2xl shadow-sm space-y-4 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <div className="space-y-4">
                  {/* Header: Photo, Name & Title */}
                  <div className="flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-full border border-primary/20 bg-primary/5 overflow-hidden shrink-0">
                      {ins.avatarUrl ? <img src={ins.avatarUrl} alt={ins.fullName ?? "Giảng viên"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">{(ins.fullName ?? "?").charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors">{ins.fullName ?? "Chưa cập nhật"}</h3>
                      <p className="text-sm font-bold text-primary">{ins.title ?? (ins.categories.length > 0 ? ins.categories[0].name : null) ?? "Giảng viên"}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        <span>{ins.categories.length > 0 ? ins.categories.map((category) => category.name).join(", ") : "Chuyên môn đang cập nhật"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio Description */}
                  <p className="text-sm leading-relaxed text-muted-foreground italic line-clamp-3">
                    &ldquo;{ins.bio ?? "Chưa có dữ liệu giới thiệu."}&rdquo;
                  </p>
                </div>

                {/* Stats Footer */}
                <div className="pt-4 border-t border-border/60 flex justify-between items-center text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Đánh giá: <strong className="text-foreground">{ins.averageRating ? `${ins.averageRating.toFixed(1)} ★` : "Chưa có dữ liệu"}</strong></span>
                  </div>
                  <div>
                    <span>Phát triển: <strong className="text-foreground">{String(ins.courseCount)} khóa học</strong></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {(hasMoreTeachers || teachers.length > 6) && (
            <div className="flex justify-center pt-6">
              {hasMoreTeachers && <Button type="button" variant="outline" className="m-2 rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-foreground hover:text-white transition-all duration-200" onClick={() => { void handleLoadMoreTeachers(); }}>Xem thêm giảng viên</Button>}
              {teachers.length > 6 && <Button type="button" variant="outline" className="m-2 rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-foreground hover:text-white transition-all duration-200" onClick={handleCollapseTeachers}>Thu gọn</Button>}
            </div>
          )}
        </section>

        {/* ==========================================
            TESTIMONIALS SECTION (REAL DATA)
            ========================================== */}
        <section id="testimonials" className="py-16 border-t border-border/60 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-foreground uppercase tracking-tight">Học viên nói gì về chúng tôi?</h2>
            <p className="text-base text-muted-foreground mt-2">Chia sẻ thực tế từ các học viên đã nâng cao hiệu suất học tập thông qua hệ thống.</p>
          </div>

          {/* Filter and Search Controls for Reviews */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 max-w-7xl mx-auto">
            {/* Keyword Search */}
            <div className="flex-1 min-w-50 relative">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tìm nội dung đánh giá
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập từ khóa bình luận..."
                  value={reviewSearchName}
                  onChange={(e) => { setReviewSearchName(e.target.value); }}
                  className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 pl-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              </div>
            </div>

            {/* Course Filter with Autocomplete Dropdown */}
            <div className="flex-1 min-w-62.5 relative" ref={courseDropdownRef}>
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Lọc theo khóa học
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowCourseDropdown(!showCourseDropdown); }}
                  className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 pl-9 pr-16 text-sm text-foreground text-left focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition truncate relative min-h-9.5"
                >
                  <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  {selectedCourse ? (
                    <span className="text-foreground">{selectedCourse.name}</span>
                  ) : (
                    <span className="text-muted-foreground/60">Tất cả khóa học</span>
                  )}
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                </button>
                {selectedCourse && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourse(null);
                    }}
                    className="absolute right-8 top-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors duration-150"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {showCourseDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <input
                    type="text"
                    placeholder="Tìm kiếm khóa học..."
                    value={courseSearchQuery}
                    onChange={(e) => { setCourseSearchQuery(e.target.value); }}
                    className="w-full bg-muted/30 border border-border/60 rounded-lg py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                    autoFocus
                  />
                  
                  <div className="max-h-50 overflow-y-auto space-y-1 scrollbar-thin">
                    {loadingCoursesList ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Đang tìm khóa học...
                      </div>
                    ) : coursesList.length > 0 ? (
                      coursesList.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowCourseDropdown(false);
                            setCourseSearchQuery("");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-primary/5 hover:text-primary hover:pl-4 ${
                            selectedCourse?.id === course.id
                              ? "bg-primary/10 text-primary font-medium pl-4"
                              : "text-foreground"
                          }`}
                        >
                          {course.name}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Không tìm thấy khóa học nào.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rating Filter */}
            <div className="w-full md:w-40">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Đánh giá
              </label>
              <select
                value={reviewFilterRating}
                onChange={(e) => { setReviewFilterRating(e.target.value); }}
                className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              >
                <option value="5">⭐⭐⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="2">⭐⭐</option>
                <option value="1">⭐</option>
                <option value="ALL">Tất cả đánh giá</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="w-full md:w-45">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sắp xếp theo
              </label>
              <select
                value={reviewSort}
                onChange={(e) => { setReviewSort(e.target.value); }}
                className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              >
                <option value="createdAt:desc">Mới nhất</option>
                <option value="createdAt:asc">Cũ nhất</option>
              </select>
            </div>
          </div>

          {loadingReviews && reviews.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/60"></div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reviews.map((rev) => {
                  const ratingVal = typeof rev.rating === "number" ? Math.round(rev.rating) : 0;
                  const name = rev.userName ?? rev.userFullName ?? rev.fullName ?? rev.username ?? rev.user?.fullName ?? rev.user?.username ?? "Chưa xác định";
                  const comment = rev.comment ?? rev.content ?? rev.description ?? "";
                  const avatar = rev.avatarUrl ?? rev.userAvatar ?? rev.user?.avatarUrl ?? rev.user?.avatar;
                  const role = rev.schoolName ?? rev.userRole ?? rev.role ?? rev.user?.role ?? "Học viên";

                  return (
                    <div key={rev.id} className="p-6 bg-card rounded-2xl border border-border/60 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        {rev.courseName && (
                          <div className="truncate text-sm font-semibold text-primary/80 mb-2" title={rev.courseName}>
                            {rev.courseName}
                          </div>
                        )}
                        {ratingVal > 0 ? (
                          <div className="flex gap-0.5 text-amber-400 mb-4">
                            {Array.from({ length: ratingVal }).map((_, i) => (
                              <Star key={`star-${String(i)}`} className="h-4.5 w-4.5 fill-current" />
                            ))}
                          </div>
                        ) : (
                          <p className="mb-4 text-xs text-muted-foreground">Chưa có đánh giá</p>
                        )}
                        <p className="text-sm text-muted-foreground italic leading-relaxed mb-6">
                          &ldquo;{comment}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-primary/20 bg-primary/5">
                          <AvatarImage src={avatar ?? undefined} alt={name} />
                          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{name}</h4>
                          <p className="text-sm text-muted-foreground">{role}</p>
                          <p className="text-xs text-muted-foreground">{formatReviewDate(rev.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More & Collapse Buttons for Reviews */}
              <div className="flex justify-center gap-3 pt-4">
                {hasMoreReviews && (
                  <Button 
                    onClick={handleLoadMoreReviews} 
                    disabled={loadingReviews}
                    variant="outline" 
                    size="sm" 
                    className="rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-foreground hover:text-white transition-all duration-200"
                  >
                    {loadingReviews ? "Đang tải..." : "Xem thêm ý kiến"}
                  </Button>
                )}
                {reviews.length > 3 && !loadingReviews && (
                  <Button 
                    onClick={handleCollapseReviews} 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full px-6 py-2 text-sm font-bold border-border/60  hover:bg-foreground hover:text-white transition-all duration-200"
                  >
                    Thu gọn
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Không tìm thấy ý kiến đánh giá nào phù hợp với bộ lọc.
            </div>
          )}
        </section>

        {/* ==========================================
            FAQ SECTION (ACCORDION)
            ========================================== */}
        <section id="faq" className="py-16 border-t border-border/60 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight uppercase">Câu hỏi thường gặp</h2>
            <p className="text-base text-muted-foreground mt-2">Giải đáp nhanh các thắc mắc về hệ thống và lộ trình học tập.</p>
          </div>

          <div className="w-full space-y-3">
            {[
              {
                id: "faq-1",
                question: "Lộ trình học tập AI cá nhân hóa hoạt động như thế nào?",
                answer: "Hệ thống AILMS sử dụng các mô hình học máy để phân tích bài kiểm tra đầu vào, điểm số bài tập và thời gian hoàn thành của bạn. Từ đó, AI tự động gợi ý tài liệu học tập, các chủ đề cần ôn tập lại và tinh chỉnh độ khó của bài tập tiếp theo để phù hợp nhất với năng lực của bạn."
              },
              {
                id: "faq-2",
                question: "Tính năng Smart Assessment là gì?",
                answer: "Đây là hệ thống đánh giá tự động dựa trên AI. Không chỉ đưa ra kết quả Đúng/Sai, Smart Assessment phân tích sâu vào các bước làm bài của bạn, đưa ra lời giải thích chi tiết tại sao sai và gợi ý cụ thể phần kiến thức lý thuyết bạn cần đọc lại để khắc phục lỗi đó."
              },
              {
                id: "faq-3",
                question: "Hệ thống hỗ trợ những thiết bị nào?",
                answer: "AILMS là nền tảng hoạt động trên nền web được thiết kế tương thích hoàn toàn (responsive) trên mọi thiết bị: Máy tính để bàn (PC), laptop, máy tính bảng (tablet) và điện thoại di động (smartphone). Bạn có thể học mọi lúc, mọi nơi chỉ với một trình duyệt web có kết nối internet."
              },
              {
                id: "faq-4",
                question: "Sau này hệ thống có mở rộng thêm các quyền khác ngoài Học viên và Quản trị viên không?",
                answer: "Có. Kiến trúc hệ thống được xây dựng theo mô hình Role-Based Access Control (RBAC) linh hoạt. Dù hiện tại hệ thống tập trung vào 2 quyền chính (ADMIN & USER), cấu trúc mã nguồn đã được định hình sẵn sàng mở rộng lên 5 quyền gồm Giáo viên (TEACHER), Trợ giảng (TA), Quản lý Nhân sự (HR) mà không ảnh hưởng đến kiến trúc cốt lõi."
              }
            ].map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div key={faq.id} className="border border-border rounded-xl bg-card px-4">
                  <button
                    onClick={() => { toggleFaq(faq.id); }}
                    className="flex w-full items-center justify-between py-4 text-sm font-bold text-left outline-none hover:text-primary transition-colors"
                  >
                    <span className="text-base">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
