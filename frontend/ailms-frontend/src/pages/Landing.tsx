import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { courseApi } from "@/api/courses/courseApi";
import { reviewApi } from "@/api/reviews/reviewApi";
import type { CategoryResponse } from "@/types/admin";
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
  BookOpen
} from "lucide-react";

const getCourseImage = (categoryName: string) => {
  const name = categoryName?.toLowerCase() || "";
  if (name.includes("lập trình") || name.includes("code") || name.includes("web") || name.includes("phần mềm") || name.includes("python")) {
    return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
  }
  if (name.includes("ai") || name.includes("trí tuệ") || name.includes("máy học") || name.includes("data") || name.includes("khoa học máy tính")) {
    return "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
  }
  if (name.includes("thiết kế") || name.includes("design") || name.includes("ui") || name.includes("ux")) {
    return "https://images.unsplash.com/photo-1561070791-26c113006238?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
  }
  if (name.includes("toán") || name.includes("math")) {
    return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
  }
  if (name.includes("tiếng anh") || name.includes("english") || name.includes("ngoại ngữ")) {
    return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
  }
  return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";
};

// Mock categories removed, now fetched from BE

// Mock TESTIMONIALS constant removed

export const Landing: React.FC = () => {
  const { auth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openRegister } = useModalStore();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [catPage, setCatPage] = useState(0);
  const [hasMoreCats, setHasMoreCats] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  const [outstandingCourses, setOutstandingCourses] = useState<any[]>([]);
  const [trendingCourses, setTrendingCourses] = useState<any[]>([]);
  const [latestCourses, setLatestCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [popularPage, setPopularPage] = useState(0);
  const [trendingPage, setTrendingPage] = useState(0);
  const [newPage, setNewPage] = useState(0);

  const [hasMorePopular, setHasMorePopular] = useState(false);
  const [hasMoreTrending, setHasMoreTrending] = useState(false);
  const [hasMoreNew, setHasMoreNew] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [reviewSearchName, setReviewSearchName] = useState("");
  const [reviewFilterRating, setReviewFilterRating] = useState<string>("5");
  const [reviewSort, setReviewSort] = useState("createdAt:desc");

  // Autocomplete states for courses
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [loadingCoursesList, setLoadingCoursesList] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  const isLoadingCoursesRef = useRef(false);

  const fetchCategories = async (page: number) => {
    try {
      setLoadingCats(true);
      const res = await courseApi.searchCategories({ page, size: 6, status: "ACTIVE" });
      if (res.data.success) {
        const pageData = res.data.data;
        const newCats = pageData.content || [];
        setCategories(prev => (page === 0 ? newCats : [...prev, ...newCats]));
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
        courseApi.getLatestCourses({ page: 0, size: 6 })
      ]);

      if (outstandingRes.data.success) {
        const pageData = outstandingRes.data.data;
        console.log("[fetchFeaturedCourses] popular data:", pageData);
        setOutstandingCourses(pageData.content || []);
        setHasMorePopular(!pageData.last);
      }
      if (trendingRes.data.success) {
        const pageData = trendingRes.data.data;
        console.log("[fetchFeaturedCourses] trending data:", pageData);
        setTrendingCourses(pageData.content || []);
        setHasMoreTrending(!pageData.last);
      }
      if (latestRes.data.success) {
        const pageData = latestRes.data.data;
        console.log("[fetchFeaturedCourses] latest data:", pageData);
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
      setLoadingCourses(true);
      console.log(`[loadMoreCourses] tabVal: ${tabVal}, popularPage: ${popularPage}, trendingPage: ${trendingPage}, newPage: ${newPage}`);
      if (tabVal === "popular") {
        const nextPage = popularPage + 1;
        const res = await courseApi.getOutstandingCourses({ page: nextPage, size: 6 });
        // console.log(`[loadMoreCourses] popular API Response:`, res.data);
        if (res.data.success) {
          const pageData = res.data.data;
          setOutstandingCourses(prev => [...prev, ...(pageData.content || [])]);
          setPopularPage(nextPage);
          setHasMorePopular(!pageData.last);
        }
      } else if (tabVal === "trending") {
        const nextPage = trendingPage + 1;
        const res = await courseApi.getTrendingCourses({ page: nextPage, size: 6 });
        // console.log(`[loadMoreCourses] trending API Response:`, res.data);
        if (res.data.success) {
          const pageData = res.data.data;
          setTrendingCourses(prev => [...prev, ...(pageData.content || [])]);
          setTrendingPage(nextPage);
          setHasMoreTrending(!pageData.last);
        }
      } else if (tabVal === "new") {
        const nextPage = newPage + 1;
        const res = await courseApi.getLatestCourses({ page: nextPage, size: 6 });
        // console.log(`[loadMoreCourses] new API Response:`, res.data);
        if (res.data.success) {
          const pageData = res.data.data;
          setLatestCourses(prev => [...prev, ...(pageData.content || [])]);
          setNewPage(nextPage);
          setHasMoreNew(!pageData.last);
        }
      }
    } catch (e) {
      console.error("Failed to load more courses:", e);
    } finally {
      isLoadingCoursesRef.current = false;
      setLoadingCourses(false);
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

    // console.log(`[Scroll] Tab: ${tabVal}, scrollRight: ${scrollRight.toFixed(1)}, hasMore: ${hasMore}, loading: ${isLoading}`);

    if (scrollRight < 150 && hasMore && !isLoading) {
      console.log(`[Scroll] Triggering loadMoreCourses for ${tabVal}`);
      loadMoreCourses(tabVal);
    }
  };

  const fetchReviews = async (page: number) => {
    try {
      setLoadingReviews(true);
      const params: any = {
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
        const pageData = res.data.data;
        const newReviews = pageData.content || [];
        setReviews(prev => (page === 0 ? newReviews : [...prev, ...newReviews]));
        setHasMoreReviews(!pageData.last);
      }
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleLoadMoreReviews = () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    fetchReviews(nextPage);
  };

  const handleCollapseReviews = () => {
    setReviewPage(0);
    fetchReviews(0);
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
        setCoursesList(res.data.data.content || []);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch courses query watcher
  useEffect(() => {
    if (showCourseDropdown) {
      console.log(`[courseSearchQuery watcher] query: "${courseSearchQuery}", show: ${showCourseDropdown}`);
      const timer = setTimeout(() => {
        fetchCoursesForSelect(courseSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [courseSearchQuery, showCourseDropdown]);

  // Debounced search for review filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setReviewPage(0);
      fetchReviews(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [reviewSearchName, reviewFilterRating, selectedCourse, reviewSort]);

  useEffect(() => {
    fetchCategories(0);
    fetchFeaturedCourses();
  }, []);

  const handleLoadMoreCats = () => {
    const nextPage = catPage + 1;
    setCatPage(nextPage);
    fetchCategories(nextPage);
  };

  const handleCollapseCats = () => {
    setCatPage(0);
    fetchCategories(0);
  };

  useEffect(() => {
    if (auth.accessToken && auth.user) {
      navigate("/dashboard", { replace: true });
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
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <div className="relative overflow-hidden bg-background">
      {/* Background gradients decor */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute top-[400px] right-1/4 -z-10 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />

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
            <span className="bg-gradient-to-r from-primary via-indigo-600 to-accent bg-clip-text text-transparent">
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
                <Button onClick={() => navigate("/explore")} variant="outline" size="lg" className="rounded-full px-8 py-6 text-base font-bold">
                  Khám phá lộ trình
                </Button>
              </>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-20 p-6 bg-card rounded-2xl border border-border/70 shadow-md">
            <div>
              <p className="text-3xl font-extrabold text-primary">15,000+</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Học viên hoạt động</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">120+</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Khóa học chuyên sâu</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-primary">95%</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Tỷ lệ hoàn thành mục tiêu</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-accent">4.9★</p>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Đánh giá trung bình</p>
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
          <h3 className="text-3xl font-extrabold uppercase tracking-wider text-muted-foreground mb-6 mt-6">Chủ đề học tập nổi bật</h3>
          
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="px-4 py-2 cursor-pointer hover:scale-105 rounded-full border border-border/70 bg-card text-sm font-bold text-foreground hover:border-primary hover:text-primary transition-all shadow-sm animate-in fade-in duration-200"
              >
                {cat.name}
              </span>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {hasMoreCats && (
              <Button 
                onClick={handleLoadMoreCats} 
                disabled={loadingCats}
                variant="outline" 
                size="sm" 
                className="rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-neutral-soft-gray/50 hover:text-primary transition-all duration-200"
              >
                {loadingCats ? "Đang tải..." : "Xem thêm chủ đề"}
              </Button>
            )}
            {categories.length > 6 && !loadingCats && (
              <Button 
                onClick={handleCollapseCats} 
                variant="outline" 
                size="sm" 
                className="rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-neutral-soft-gray/50 hover:text-primary transition-all duration-200"
              >
                Thu gọn
              </Button>
            )}
          </div>
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
                <TabsTrigger value="popular" className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg">Nổi bật</TabsTrigger>
                <TabsTrigger value="trending" className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg">Thịnh hành</TabsTrigger>
                <TabsTrigger value="new" className="px-5 py-2 m-1 text-sm hover:bg-foreground hover:text-white focus:bg-foreground focus:text-white font-semibold rounded-lg">Mới nhất</TabsTrigger>
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
                    <div 
                      onScroll={(e) => handleScroll(e, tabVal as "popular" | "trending" | "new")}
                      className={`flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent snap-x snap-mandatory -mx-6 px-6 md:-mx-12 md:px-12 ${
                        currentCourses.length < 3 ? "justify-center" : "justify-start"
                      } ${currentCourses.length <= 3 ? "md:justify-center" : "md:justify-start"}`}
                    >
                      {currentCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className="flex-none w-[260px] sm:w-[290px] snap-start flex flex-col bg-card rounded-2xl border border-border/70 shadow-sm hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 cursor-pointer overflow-hidden group transition-all duration-300"
                        >
                          <div className="relative aspect-video overflow-hidden bg-muted">
                            {course.image ? (
                              <img
                                src={course.image}
                                alt={course.name}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <img
                                src={getCourseImage(course.categoryName)}
                                alt={course.name}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                            <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-primary shadow">
                              {course.level}
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
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                                <span className="font-bold text-foreground">{course.avgRating || 4.5}</span>
                                <span>({course.enrollmentCount || 0} học viên)</span>
                              </div>
                              <span className="font-medium text-primary">
                                {course.suggestedPrice ? `${course.suggestedPrice.toLocaleString()}đ` : "Miễn phí"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
            <div className="flex-1 min-w-[200px] relative">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tìm nội dung đánh giá
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập từ khóa bình luận..."
                  value={reviewSearchName}
                  onChange={(e) => setReviewSearchName(e.target.value)}
                  className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 pl-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              </div>
            </div>

            {/* Course Filter with Autocomplete Dropdown */}
            <div className="flex-1 min-w-[250px] relative" ref={courseDropdownRef}>
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Lọc theo khóa học
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                  className="w-full bg-muted/50 border border-border/60 rounded-xl py-2 px-3 pl-9 pr-16 text-sm text-foreground text-left focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition truncate relative min-h-[38px]"
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
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full bg-muted/30 border border-border/60 rounded-lg py-1.5 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                    autoFocus
                  />
                  
                  <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
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
            <div className="w-full md:w-[160px]">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Đánh giá
              </label>
              <select
                value={reviewFilterRating}
                onChange={(e) => setReviewFilterRating(e.target.value)}
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
            <div className="w-full md:w-[180px]">
              <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sắp xếp theo
              </label>
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
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
                  const ratingVal = Math.round(rev.rating || 5);
                  const name = rev.userName || rev.userFullName || rev.fullName || rev.username || rev.user?.fullName || rev.user?.username || "Học viên ẩn danh";
                  const comment = rev.comment || rev.content || rev.description || "";
                  const avatar = rev.avatarUrl || rev.userAvatar || rev.user?.avatarUrl || rev.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rev.id || name}`;
                  const role = rev.schoolName || rev.userRole || rev.role || rev.user?.role || "Học viên";

                  return (
                    <div key={rev.id} className="p-6 bg-card rounded-2xl border border-border/60 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        {rev.courseName && (
                          <div className="truncate text-sm font-semibold text-primary/80 mb-2" title={rev.courseName}>
                            {rev.courseName}
                          </div>
                        )}
                        <div className="flex gap-0.5 text-amber-400 mb-4">
                          {[...Array(ratingVal)].map((_, i) => (
                            <Star key={i} className="h-4.5 w-4.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground italic leading-relaxed mb-6">
                          &ldquo;{comment}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={avatar}
                          alt={name}
                          className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 object-cover"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{name}</h4>
                          <p className="text-sm text-muted-foreground">{role}</p>
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
                    className="rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-neutral-soft-gray/50 hover:text-primary transition-all duration-200"
                  >
                    {loadingReviews ? "Đang tải..." : "Xem thêm ý kiến"}
                  </Button>
                )}
                {reviews.length > 3 && !loadingReviews && (
                  <Button 
                    onClick={handleCollapseReviews} 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full px-6 py-2 text-sm font-bold border-border/60 hover:bg-neutral-soft-gray/50 hover:text-primary transition-all duration-200"
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
                    onClick={() => toggleFaq(faq.id)}
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
